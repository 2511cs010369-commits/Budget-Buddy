package com.budgetbuddy;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/** A dependency-free HTTP server that avoids the failing jdk.httpserver NIO selector. */
public final class SimpleBudgetBuddyServer {
    private static final Path WEB = Path.of("src", "main", "resources", "static").toAbsolutePath().normalize();
    private static final Path STATE_FILE = Path.of("data", "budget-buddy-state.properties").toAbsolutePath().normalize();
    private static final AtomicInteger BALANCE = new AtomicInteger(22350);
    private static final AtomicInteger SAVED = new AtomicInteger(35000);
    private static final AtomicInteger STREAK = new AtomicInteger(12);
    private static final AtomicInteger EVENT_VERSION = new AtomicInteger();
    private static final Object EVENT_MONITOR = new Object();
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int PASSWORD_ITERATIONS = 210_000;

    private SimpleBudgetBuddyServer() {}

    public static void main(String[] args) throws IOException {
        loadState();
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        ServerSocket server = new ServerSocket();
        server.setReuseAddress(true);
        server.bind(new InetSocketAddress("0.0.0.0", port));
        Runtime.getRuntime().addShutdownHook(new Thread(() -> closeQuietly(server)));
        System.out.println("Budget Buddy is running at http://localhost:" + port);

        while (!server.isClosed()) {
            try {
                Socket client = server.accept();
                Thread.startVirtualThread(() -> handle(client));
            } catch (SocketException error) {
                if (!server.isClosed()) throw error;
            }
        }
    }

    private static void handle(Socket client) {
        try (client; InputStream input = new BufferedInputStream(client.getInputStream()); OutputStream output = new BufferedOutputStream(client.getOutputStream())) {
            client.setSoTimeout(15_000);
            String requestLine = readLine(input);
            if (requestLine == null || requestLine.isBlank()) return;
            String[] parts = requestLine.split(" ", 3);
            if (parts.length < 2) {
                write(output, "GET", text(400, "Bad request"));
                return;
            }

            String method = parts[0].toUpperCase(Locale.ROOT);
            Map<String, String> headers = new HashMap<>();
            for (String line; (line = readLine(input)) != null && !line.isEmpty();) {
                int colon = line.indexOf(':');
                if (colon > 0) headers.put(line.substring(0, colon).trim().toLowerCase(Locale.ROOT), line.substring(colon + 1).trim());
            }
            int contentLength = parsePositiveInt(headers.get("content-length"));
            byte[] body = contentLength == 0 ? new byte[0] : input.readNBytes(contentLength);
            String path = requestPath(parts[1]);
            if ("/api/events".equals(path) && isGet(method)) {
                streamEvents(output);
                return;
            }
            write(output, method, route(method, path, body, headers));
        } catch (IOException error) {
            System.err.println("Request failed: " + error.getMessage());
        }
    }

    private static Response route(String method, String path, byte[] body, Map<String, String> headers) throws IOException {
        if (path == null || path.isBlank()) path = "/";
        return switch (path) {
            case "/api/signup" -> accountSignup(method, new String(body, StandardCharsets.UTF_8));
            case "/api/login" -> accountLogin(method, new String(body, StandardCharsets.UTF_8));
            case "/api/logout" -> accountLogout(method, headers);
            case "/api/summary" -> isGet(method) ? summaryResponse(headers) : methodNotAllowed("GET");
            case "/api/save" -> saveToday(method, headers);
            case "/api/transaction" -> transaction(method, new String(body, StandardCharsets.UTF_8), headers);
            case "/api/advice" -> advice(method, new String(body, StandardCharsets.UTF_8));
            default -> staticFile(path);
        };
    }

    private static Response accountSignup(String method, String body) {
        if (!"POST".equals(method)) return methodNotAllowed("POST");
        String name = extractString(body, "name").trim();
        String email = extractString(body, "email").trim().toLowerCase(Locale.ROOT);
        String password = extractString(body, "password");
        if (name.length() < 2) return json(400, "{\"error\":\"Enter your full name.\"}");
        if (!validEmail(email)) return json(400, "{\"error\":\"Enter a valid email address.\"}");
        if (password.length() < 8) return json(400, "{\"error\":\"Password must contain at least 8 characters.\"}");
        if (!supabaseConfigured()) return configurationError();
        try {
            RemoteResponse existing = supabaseAdmin("GET", "/rest/v1/users?select=user_id&email=eq." + encode(email) + "&limit=1", null, null);
            if (existing.status >= 300) throw new IOException(existing.body);
            if (!"[]".equals(existing.body.trim())) return json(409, "{\"error\":\"An account with this email already exists.\"}");
            String userId = UUID.randomUUID().toString();
            String payload = "{\"user_id\":\"" + userId + "\",\"name\":\"" + escapeJson(name) + "\",\"email\":\"" + escapeJson(email)
                + "\",\"password_hash\":\"" + escapeJson(hashPassword(password)) + "\"}";
            RemoteResponse created = supabaseAdmin("POST", "/rest/v1/users", payload, "return=minimal");
            if (created.status >= 300) throw new IOException(created.body);
            return createSessionResponse(userId, name, email);
        } catch (Exception error) {
            System.err.println("Signup failed: " + error.getMessage());
            return json(502, "{\"error\":\"Could not create the account. Check the database setup and try again.\"}");
        }
    }

    private static Response accountLogin(String method, String body) {
        if (!"POST".equals(method)) return methodNotAllowed("POST");
        String email = extractString(body, "email").trim().toLowerCase(Locale.ROOT);
        String password = extractString(body, "password");
        if (!validEmail(email) || password.isBlank()) return json(400, "{\"error\":\"Enter your email and password.\"}");
        if (!supabaseConfigured()) return configurationError();
        try {
            RemoteResponse found = supabaseAdmin("GET", "/rest/v1/users?select=user_id,name,email,password_hash&email=eq." + encode(email) + "&limit=1", null, null);
            if (found.status >= 300) throw new IOException(found.body);
            String userId = firstJsonString(found.body, "user_id", "");
            String storedHash = firstJsonString(found.body, "password_hash", "");
            if (userId.isBlank() || !verifyPassword(password, storedHash)) return json(401, "{\"error\":\"Incorrect email or password.\"}");
            return createSessionResponse(userId, firstJsonString(found.body, "name", "Budget Buddy User"), email);
        } catch (Exception error) {
            System.err.println("Login failed: " + error.getMessage());
            return json(502, "{\"error\":\"Could not sign in. Please try again.\"}");
        }
    }

    private static Response accountLogout(String method, Map<String, String> headers) {
        if (!"POST".equals(method)) return methodNotAllowed("POST");
        String token = bearerToken(headers);
        if (!token.isBlank() && supabaseConfigured()) {
            try { supabaseAdmin("DELETE", "/rest/v1/sessions?token_hash=eq." + sha256Hex(token), null, null); }
            catch (Exception ignored) {}
        }
        return json(200, "{\"message\":\"Signed out.\"}");
    }

    private static Response createSessionResponse(String userId, String name, String email) throws Exception {
        byte[] tokenBytes = new byte[32];
        RANDOM.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        String expiresAt = Instant.now().plusSeconds(30L * 24 * 60 * 60).toString();
        RemoteResponse session = supabaseAdmin("POST", "/rest/v1/sessions",
            "{\"user_id\":\"" + userId + "\",\"token_hash\":\"" + sha256Hex(token) + "\",\"expires_at\":\"" + expiresAt + "\"}", "return=minimal");
        if (session.status >= 300) throw new IOException(session.body);
        return json(200, "{\"access_token\":\"" + token + "\",\"expires_at\":\"" + expiresAt + "\",\"user\":{\"email\":\""
            + escapeJson(email) + "\",\"user_metadata\":{\"full_name\":\"" + escapeJson(name) + "\"}}}");
    }

    private static Response summaryResponse(Map<String, String> headers) {
        String token = bearerToken(headers);
        if (token.isBlank()) return json(401, "{\"error\":\"Please sign in.\"}");
        if (!supabaseConfigured()) return configurationError();
        try { return json(200, supabaseSummary(requireSession(token))); }
        catch (SecurityException error) { return json(401, "{\"error\":\"Your session expired. Please sign in again.\"}"); }
        catch (Exception error) { return json(502, "{\"error\":\"Could not load your Supabase data.\"}"); }
    }

    private static String summary() {
        return "{\"name\":\"Budget Buddy User\",\"balance\":" + BALANCE.get() + ",\"saved\":" + SAVED.get()
            + ",\"goal\":60000,\"streak\":" + STREAK.get() + ",\"dailySaving\":20,"
            + "\"updatedAt\":\"" + LocalDateTime.now() + "\","
            + "\"expenses\":[{\"name\":\"Food\",\"amount\":6250},{\"name\":\"Shopping\",\"amount\":3500},"
            + "{\"name\":\"Transport\",\"amount\":2470},{\"name\":\"Bills\",\"amount\":1650},"
            + "{\"name\":\"Entertainment\",\"amount\":1310}]}";
    }

    private static Response saveToday(String method, Map<String, String> headers) {
        if (!"POST".equals(method)) return methodNotAllowed("POST");
        String token = bearerToken(headers);
        if (!token.isBlank() && supabaseConfigured()) {
            try {
                String userId = requireSession(token);
                RemoteResponse result = supabaseAdmin("POST", "/rest/v1/savings",
                    "{\"user_id\":\"" + escapeJson(userId) + "\",\"amount\":20}", "return=minimal");
                if (result.status >= 300) return json(result.status, "{\"error\":\"Saving could not be recorded.\"}");
                return json(200, "{\"message\":\"Great job! ₹20 was securely added to your savings.\"}");
            } catch (Exception error) { return json(502, "{\"error\":\"Supabase is temporarily unavailable.\"}"); }
        }
        int saved = SAVED.addAndGet(20);
        int balance = BALANCE.addAndGet(-20);
        int streak = STREAK.incrementAndGet();
        stateChanged();
        return json(200, "{\"saved\":" + saved + ",\"balance\":" + balance + ",\"streak\":" + streak
            + ",\"message\":\"Great job! ₹20 added to your Laptop Fund.\"}");
    }

    private static Response transaction(String method, String body, Map<String, String> headers) {
        if (!"POST".equals(method)) return methodNotAllowed("POST");
        int amount = extractInt(body, "amount");
        String type = extractString(body, "type");
        if (amount <= 0) return json(400, "{\"error\":\"Enter a valid amount\"}");
        String token = bearerToken(headers);
        if (!token.isBlank() && supabaseConfigured()) {
            try {
                String userId = requireSession(token);
                RemoteResponse result = supabaseAdmin("POST", "/rest/v1/transactions",
                    "{\"user_id\":\"" + escapeJson(userId) + "\",\"type\":\"" + escapeJson(type) + "\",\"amount\":" + amount + "}", "return=minimal");
                if (result.status >= 300) return json(result.status, "{\"error\":\"Transaction could not be recorded.\"}");
                return json(200, "{\"message\":\"Transaction saved securely.\"}");
            } catch (Exception error) { return json(502, "{\"error\":\"Supabase is temporarily unavailable.\"}"); }
        }
        int balance = BALANCE.addAndGet("income".equals(type) ? amount : -amount);
        stateChanged();
        return json(200, "{\"balance\":" + balance + ",\"message\":\"Transaction recorded successfully.\"}");
    }

    private static Response advice(String method, String question) {
        if (!"POST".equals(method)) return methodNotAllowed("POST");
        String q = question.toLowerCase(Locale.ROOT);
        String answer = q.contains("afford") || q.contains("buy")
            ? "You can plan this purchase, but protect your emergency buffer first. At your current pace, spending ₹10,000 would delay your Laptop goal by about two weeks."
            : q.contains("food")
                ? "Food is your largest category at ₹6,250. Reducing it by ₹500 monthly adds ₹6,000 to your annual savings."
                : "You can safely target ₹3,000 in savings this month. Keep the ₹20 daily jar and move extra money to your goal after essential bills are covered.";
        return json(200, "{\"answer\":\"" + escapeJson(answer) + "\",\"time\":\"" + LocalDateTime.now() + "\"}");
    }

    private static boolean supabaseConfigured() {
        return !System.getenv().getOrDefault("SUPABASE_URL", "").isBlank()
            && !System.getenv().getOrDefault("SUPABASE_SECRET_KEY", "").isBlank();
    }

    private static String supabaseSummary(String userId) throws Exception {
        RemoteResponse profile = supabaseAdmin("GET", "/rest/v1/users?select=name&user_id=eq." + userId + "&limit=1", null, null);
        RemoteResponse transactions = supabaseAdmin("GET", "/rest/v1/transactions?select=type,amount&user_id=eq." + userId, null, null);
        RemoteResponse savings = supabaseAdmin("GET", "/rest/v1/savings?select=amount,saved_date&user_id=eq." + userId, null, null);
        RemoteResponse goals = supabaseAdmin("GET", "/rest/v1/goals?select=target_amount,saved_amount&user_id=eq." + userId + "&order=created_at.asc&limit=1", null, null);
        if (profile.status >= 300 || transactions.status >= 300 || savings.status >= 300 || goals.status >= 300) throw new IOException("Supabase query failed");

        int income = 0, expenses = 0;
        var transactionMatcher = java.util.regex.Pattern.compile("\\\"type\\\":\\\"(income|expense)\\\"[^}]*?\\\"amount\\\":([0-9.]+)").matcher(transactions.body);
        while (transactionMatcher.find()) {
            int value = (int)Math.round(Double.parseDouble(transactionMatcher.group(2)));
            if ("income".equals(transactionMatcher.group(1))) income += value; else expenses += value;
        }
        int saved = sumJsonNumbers(savings.body, "amount");
        int goal = firstJsonNumber(goals.body, "target_amount", 60000);
        String name = firstJsonString(profile.body, "name", "Budget Buddy User");
        int streak = countDistinctDates(savings.body);
        return "{\"name\":\"" + escapeJson(name) + "\",\"balance\":" + (income - expenses)
            + ",\"saved\":" + saved + ",\"goal\":" + goal + ",\"streak\":" + streak
            + ",\"dailySaving\":20,\"updatedAt\":\"" + LocalDateTime.now() + "\","
            + "\"expenses\":[{\"name\":\"Recorded expenses\",\"amount\":" + expenses + "}]}";
    }

    private static RemoteResponse supabaseAdmin(String method, String path, String body, String prefer) throws Exception {
        String url = System.getenv("SUPABASE_URL").replaceAll("/+$", "") + path;
        HttpURLConnection connection = (HttpURLConnection)URI.create(url).toURL().openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(10_000);
        connection.setReadTimeout(15_000);
        String secret = System.getenv("SUPABASE_SECRET_KEY");
        connection.setRequestProperty("apikey", secret);
        connection.setRequestProperty("Authorization", "Bearer " + secret);
        connection.setRequestProperty("Content-Type", "application/json");
        if (prefer != null) connection.setRequestProperty("Prefer", prefer);
        if (body != null) {
            connection.setDoOutput(true);
            try (OutputStream output = connection.getOutputStream()) { output.write(body.getBytes(StandardCharsets.UTF_8)); }
        }
        int status = connection.getResponseCode();
        InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
        String responseBody = stream == null ? "" : new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        connection.disconnect();
        return new RemoteResponse(status, responseBody);
    }

    private static String bearerToken(Map<String, String> headers) {
        String value = headers.getOrDefault("authorization", "");
        return value.regionMatches(true, 0, "Bearer ", 0, 7) ? value.substring(7).trim() : "";
    }

    private static String requireSession(String token) throws Exception {
        RemoteResponse found = supabaseAdmin("GET", "/rest/v1/sessions?select=user_id&token_hash=eq." + sha256Hex(token)
            + "&expires_at=gt." + encode(Instant.now().toString()) + "&limit=1", null, null);
        String userId = found.status < 300 ? firstJsonString(found.body, "user_id", "") : "";
        if (userId.isBlank()) throw new SecurityException("Invalid session");
        return userId;
    }

    private static String hashPassword(String password) throws Exception {
        byte[] salt = new byte[16]; RANDOM.nextBytes(salt);
        byte[] hash = pbkdf2(password, salt, PASSWORD_ITERATIONS);
        return "pbkdf2_sha256$" + PASSWORD_ITERATIONS + "$" + Base64.getEncoder().encodeToString(salt) + "$" + Base64.getEncoder().encodeToString(hash);
    }

    private static boolean verifyPassword(String password, String stored) throws Exception {
        String[] parts = stored.split("\\$");
        if (parts.length != 4 || !"pbkdf2_sha256".equals(parts[0])) return false;
        byte[] actual = pbkdf2(password, Base64.getDecoder().decode(parts[2]), Integer.parseInt(parts[1]));
        return MessageDigest.isEqual(actual, Base64.getDecoder().decode(parts[3]));
    }

    private static byte[] pbkdf2(String password, byte[] salt, int iterations) throws Exception {
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, iterations, 256);
        try { return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded(); }
        finally { spec.clearPassword(); }
    }

    private static String sha256Hex(String value) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(digest);
    }

    private static String encode(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20"); }
    private static boolean validEmail(String email) { return email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"); }
    private static Response configurationError() { return json(503, "{\"error\":\"Database access is not configured on the server.\"}"); }

    private static int sumJsonNumbers(String json, String key) {
        var matcher = java.util.regex.Pattern.compile("\\\"" + key + "\\\":([0-9.]+)").matcher(json);
        double total = 0; while (matcher.find()) total += Double.parseDouble(matcher.group(1));
        return (int)Math.round(total);
    }

    private static int firstJsonNumber(String json, String key, int fallback) {
        var matcher = java.util.regex.Pattern.compile("\\\"" + key + "\\\":([0-9.]+)").matcher(json);
        return matcher.find() ? (int)Math.round(Double.parseDouble(matcher.group(1))) : fallback;
    }

    private static String firstJsonString(String json, String key, String fallback) {
        var matcher = java.util.regex.Pattern.compile("\\\"" + key + "\\\":\\\"([^\\\"]*)").matcher(json);
        return matcher.find() ? matcher.group(1) : fallback;
    }

    private static int countDistinctDates(String json) {
        Set<String> dates = new HashSet<>();
        var matcher = java.util.regex.Pattern.compile("\\\"saved_date\\\":\\\"(\\d{4}-\\d{2}-\\d{2})").matcher(json);
        while (matcher.find()) dates.add(matcher.group(1));
        return dates.size();
    }

    private static Response staticFile(String rawPath) throws IOException {
        String page = switch (rawPath) {
            case "/" -> "landing-v2.html";
            case "/login" -> "login-v2.html";
            case "/app" -> "app.html";
            case "/insights" -> "insights.html";
            case "/goals" -> "goals.html";
            case "/challenges" -> "challenges.html";
            case "/family" -> "family.html";
            case "/ai-chat" -> "ai-chat.html";
            case "/settings" -> "settings.html";
            case "/auth/callback" -> "auth-callback.html";
            default -> rawPath.startsWith("/") ? rawPath.substring(1) : rawPath;
        };
        Path file = WEB.resolve(page).normalize();
        if (!file.startsWith(WEB) || !Files.isRegularFile(file)) return text(404, "Not found");
        byte[] content = Files.readAllBytes(file);
        if (page.endsWith(".html")) content = decorateHtml(page, content);
        return new Response(200, contentType(page), content);
    }

    private static byte[] decorateHtml(String page, byte[] content) {
        String html = new String(content, StandardCharsets.UTF_8).replace("</head>",
            "<meta name=\"theme-color\" content=\"#071d17\"><link rel=\"icon\" type=\"image/png\" href=\"/assets/budget-buddy-icon.png\"><link rel=\"apple-touch-icon\" href=\"/assets/budget-buddy-icon.png\"><link rel=\"manifest\" href=\"/manifest.webmanifest\"><script>document.documentElement.dataset.theme=localStorage.getItem('budgetBuddyTheme')||'dark';document.documentElement.dataset.accent=localStorage.getItem('budgetBuddyAccent')||'emerald'</script><link rel=\"stylesheet\" href=\"/theme.css\"><link rel=\"stylesheet\" href=\"/motion.css\"><link rel=\"stylesheet\" href=\"/brand.css\"><script defer src=\"/motion.js\"></script><script defer src=\"/brand.js\"></script></head>");
        if (page.equals("settings.html")) html = html.replace("</body>", "<script src=\"/settings.js\"></script></body>");
        if (page.equals("login.html") || page.equals("auth-callback.html")) html = html.replace("</head>", "<link rel=\"stylesheet\" href=\"/auth.css\"></head>");
        if (page.equals("app.html")) html = html.replace("</body>", "<link rel=\"stylesheet\" href=\"/charts.css\"><script src=\"/charts.js\"></script></body>");
        if (page.equals("insights.html")) html = html.replace("</body>", "<link rel=\"stylesheet\" href=\"/insights-chart.css\"><script src=\"/insights-chart.js\"></script></body>");
        if (page.equals("family.html")) html = html.replace("</head>", "<link rel=\"stylesheet\" href=\"/family-chat.css\"><link rel=\"stylesheet\" href=\"/family-games.css\"></head>").replace("</body>", "<script src=\"/family-chat.js\"></script><script src=\"/family-games.js\"></script></body>");
        if (Set.of("app.html", "insights.html", "goals.html", "challenges.html", "family.html", "ai-chat.html", "settings.html").contains(page)) {
            html = html.replace("</head>", "<link rel=\"stylesheet\" href=\"/app-v3.css\"><link rel=\"stylesheet\" href=\"/realtime.css\"></head>")
                .replace("</body>", "<script src=\"/app-v3.js\"></script><script src=\"/realtime.js\"></script></body>");
        }
        return html.getBytes(StandardCharsets.UTF_8);
    }

    private static String contentType(String page) {
        String lower = page.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".css")) return "text/css; charset=utf-8";
        if (lower.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (lower.endsWith(".json")) return "application/json; charset=utf-8";
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        return "text/html; charset=utf-8";
    }

    private static void streamEvents(OutputStream output) throws IOException {
        byte[] headers = ("HTTP/1.1 200 OK\r\n"
            + "Content-Type: text/event-stream; charset=utf-8\r\n"
            + "Cache-Control: no-cache\r\n"
            + "Connection: keep-alive\r\n"
            + "X-Accel-Buffering: no\r\n\r\n").getBytes(StandardCharsets.ISO_8859_1);
        output.write(headers);
        output.flush();
        int seen = -1;
        while (true) {
            int current;
            synchronized (EVENT_MONITOR) {
                current = EVENT_VERSION.get();
                if (seen == current) {
                    try { EVENT_MONITOR.wait(15_000); }
                    catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); return; }
                    current = EVENT_VERSION.get();
                }
            }
            String event = "event: summary\nid: " + current + "\ndata: " + summary() + "\n\n";
            output.write(event.getBytes(StandardCharsets.UTF_8));
            output.flush();
            seen = current;
        }
    }

    private static void stateChanged() {
        persistState();
        EVENT_VERSION.incrementAndGet();
        synchronized (EVENT_MONITOR) { EVENT_MONITOR.notifyAll(); }
    }

    private static synchronized void loadState() {
        if (!Files.isRegularFile(STATE_FILE)) return;
        Properties properties = new Properties();
        try (InputStream input = Files.newInputStream(STATE_FILE)) {
            properties.load(input);
            BALANCE.set(parsePositiveInt(properties.getProperty("balance")));
            SAVED.set(parsePositiveInt(properties.getProperty("saved")));
            STREAK.set(parsePositiveInt(properties.getProperty("streak")));
        } catch (IOException error) {
            System.err.println("Could not load saved state: " + error.getMessage());
        }
    }

    private static synchronized void persistState() {
        Properties properties = new Properties();
        properties.setProperty("balance", String.valueOf(BALANCE.get()));
        properties.setProperty("saved", String.valueOf(SAVED.get()));
        properties.setProperty("streak", String.valueOf(STREAK.get()));
        try {
            Files.createDirectories(STATE_FILE.getParent());
            Path temporary = STATE_FILE.resolveSibling(STATE_FILE.getFileName() + ".tmp");
            try (OutputStream output = Files.newOutputStream(temporary, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING)) {
                properties.store(output, "Budget Buddy persistent state");
            }
            try { Files.move(temporary, STATE_FILE, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE); }
            catch (AtomicMoveNotSupportedException ignored) { Files.move(temporary, STATE_FILE, StandardCopyOption.REPLACE_EXISTING); }
        } catch (IOException error) {
            System.err.println("Could not save state: " + error.getMessage());
        }
    }

    private static void write(OutputStream output, String method, Response response) throws IOException {
        byte[] headers = ("HTTP/1.1 " + response.status + " " + reason(response.status) + "\r\n"
            + "Content-Type: " + response.contentType + "\r\n"
            + "Content-Length: " + response.body.length + "\r\n"
            + "Cache-Control: no-store\r\n"
            + "X-Content-Type-Options: nosniff\r\n"
            + "Connection: close\r\n\r\n").getBytes(StandardCharsets.ISO_8859_1);
        output.write(headers);
        if (!"HEAD".equals(method)) output.write(response.body);
        output.flush();
    }

    private static String readLine(InputStream input) throws IOException {
        ByteArrayOutputStream line = new ByteArrayOutputStream();
        int previous = -1;
        for (int current; (current = input.read()) != -1;) {
            if (previous == '\r' && current == '\n') {
                byte[] value = line.toByteArray();
                return new String(value, 0, Math.max(0, value.length - 1), StandardCharsets.ISO_8859_1);
            }
            line.write(current);
            previous = current;
            if (line.size() > 16_384) throw new IOException("HTTP header line is too large");
        }
        return line.size() == 0 ? null : line.toString(StandardCharsets.ISO_8859_1);
    }

    private static String requestPath(String target) {
        try { return new URI(target).getPath(); }
        catch (URISyntaxException ignored) { return target.split("\\?", 2)[0]; }
    }

    private static int parsePositiveInt(String value) {
        if (value == null) return 0;
        try { return Math.max(0, Integer.parseInt(value)); }
        catch (NumberFormatException ignored) { return 0; }
    }

    private static boolean isGet(String method) { return "GET".equals(method) || "HEAD".equals(method); }
    private static Response methodNotAllowed(String allowed) { return json(405, "{\"error\":\"" + allowed + " required\"}"); }

    private static int extractInt(String body, String key) {
        var matcher = java.util.regex.Pattern.compile("\\\"" + key + "\\\"\\s*:\\s*(\\d+)").matcher(body);
        return matcher.find() ? Integer.parseInt(matcher.group(1)) : 0;
    }

    private static String extractString(String body, String key) {
        var matcher = java.util.regex.Pattern.compile("\\\"" + key + "\\\"\\s*:\\s*\\\"([^\\\"]*)").matcher(body);
        return matcher.find() ? matcher.group(1) : "";
    }

    private static String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

    private static Response json(int status, String body) { return new Response(status, "application/json; charset=utf-8", bytes(body)); }
    private static Response text(int status, String body) { return new Response(status, "text/plain; charset=utf-8", bytes(body)); }
    private static byte[] bytes(String value) { return value.getBytes(StandardCharsets.UTF_8); }

    private static String reason(int status) {
        return switch (status) {
            case 200 -> "OK";
            case 400 -> "Bad Request";
            case 404 -> "Not Found";
            case 405 -> "Method Not Allowed";
            default -> "Error";
        };
    }

    private static void closeQuietly(Closeable closeable) {
        try { closeable.close(); } catch (IOException ignored) {}
    }

    private record Response(int status, String contentType, byte[] body) {}
    private record RemoteResponse(int status, String body) {}
}
