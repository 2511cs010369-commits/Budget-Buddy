package com.budgetbuddy;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.concurrent.Executors;

public final class BudgetBuddyServer {
    private static final Path WEB = Path.of("src", "main", "resources", "static").toAbsolutePath().normalize();
    private static volatile int balance = 22350;
    private static volatile int saved = 35000;
    private static volatile int streak = 12;

    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/api/summary", e -> json(e, 200, summary()));
        server.createContext("/api/save", BudgetBuddyServer::saveToday);
        server.createContext("/api/transaction", BudgetBuddyServer::transaction);
        server.createContext("/api/advice", BudgetBuddyServer::advice);
        server.createContext("/api/auth-config", BudgetBuddyServer::authConfig);
        server.createContext("/", BudgetBuddyServer::staticFile);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        server.start();
        System.out.println("Budget Buddy is running at http://localhost:" + port);
    }

    private static String summary() {
        return "{\"name\":\"Ananya\",\"balance\":" + balance + ",\"saved\":" + saved
            + ",\"goal\":60000,\"streak\":" + streak + ",\"dailySaving\":20,"
            + "\"expenses\":[{\"name\":\"Food\",\"amount\":6250},{\"name\":\"Shopping\",\"amount\":3500},"
            + "{\"name\":\"Transport\",\"amount\":2470},{\"name\":\"Bills\",\"amount\":1650},"
            + "{\"name\":\"Entertainment\",\"amount\":1310}]}";
    }

    private static void saveToday(HttpExchange e) throws IOException {
        if (!"POST".equals(e.getRequestMethod())) { json(e, 405, "{\"error\":\"POST required\"}"); return; }
        saved += 20; balance -= 20; streak++;
        json(e, 200, "{\"saved\":" + saved + ",\"balance\":" + balance + ",\"streak\":" + streak + ",\"message\":\"Great job! ₹20 added to your Laptop Fund.\"}");
    }

    private static void transaction(HttpExchange e) throws IOException {
        if (!"POST".equals(e.getRequestMethod())) { json(e, 405, "{\"error\":\"POST required\"}"); return; }
        String body = new String(e.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        int amount = extractInt(body, "amount");
        String type = extractString(body, "type");
        if (amount <= 0) { json(e, 400, "{\"error\":\"Enter a valid amount\"}"); return; }
        balance += "income".equals(type) ? amount : -amount;
        json(e, 200, "{\"balance\":" + balance + ",\"message\":\"Transaction recorded successfully.\"}");
    }

    private static void advice(HttpExchange e) throws IOException {
        if (!"POST".equals(e.getRequestMethod())) { json(e, 405, "{\"error\":\"POST required\"}"); return; }
        String q = new String(e.getRequestBody().readAllBytes(), StandardCharsets.UTF_8).toLowerCase();
        String answer = q.contains("afford") || q.contains("buy")
            ? "You can plan this purchase, but protect your emergency buffer first. At your current pace, spending ₹10,000 would delay your Laptop goal by about two weeks."
            : q.contains("food") ? "Food is your largest category at ₹6,250. Reducing it by ₹500 monthly adds ₹6,000 to your annual savings."
            : "You can safely target ₹3,000 in savings this month. Keep the ₹20 daily jar and move extra money to your goal after essential bills are covered.";
        json(e, 200, "{\"answer\":\"" + answer + "\",\"time\":\"" + LocalDateTime.now() + "\"}");
    }

    private static void authConfig(HttpExchange e) throws IOException {
        String url = System.getenv().getOrDefault("SUPABASE_URL", "").replaceAll("/+$", "");
        String key = System.getenv().getOrDefault("SUPABASE_PUBLISHABLE_KEY", "");
        json(e, 200, "{\"configured\":" + (!url.isBlank() && !key.isBlank())
            + ",\"url\":\"" + escapeJson(url) + "\",\"publishableKey\":\"" + escapeJson(key) + "\"}");
    }

    private static void staticFile(HttpExchange e) throws IOException {
        String raw = e.getRequestURI().getPath();
        String page = switch (raw) {
            case "/" -> "index.html"; case "/login" -> "login.html"; case "/app" -> "app.html";
            case "/insights" -> "insights.html"; case "/goals" -> "goals.html";
            case "/challenges" -> "challenges.html"; case "/family" -> "family.html"; case "/ai-chat" -> "ai-chat.html";
            case "/settings" -> "settings.html"; case "/auth/callback" -> "auth-callback.html"; default -> raw.substring(1);
        };
        Path file = WEB.resolve(page).normalize();
        if (!file.startsWith(WEB) || !Files.isRegularFile(file)) { send(e, 404, "text/plain", "Not found".getBytes(StandardCharsets.UTF_8)); return; }
        String type = page.endsWith(".css") ? "text/css" : page.endsWith(".js") ? "application/javascript" : page.endsWith(".mp4") ? "video/mp4" : "text/html";
        byte[] content = Files.readAllBytes(file);
        if (page.endsWith(".html")) {
            String html = new String(content, StandardCharsets.UTF_8).replace("</head>",
                "<script>document.documentElement.dataset.theme=localStorage.getItem('budgetBuddyTheme')||'dark';document.documentElement.dataset.accent=localStorage.getItem('budgetBuddyAccent')||'emerald'</script><link rel=\"stylesheet\" href=\"/theme.css\"><link rel=\"stylesheet\" href=\"/motion.css\"><script defer src=\"/motion.js\"></script></head>");
            if (page.equals("settings.html")) html = html.replace("</body>", "<script src=\"/settings.js\"></script></body>");
            if (page.equals("login.html") || page.equals("auth-callback.html")) html = html.replace("</head>", "<link rel=\"stylesheet\" href=\"/auth.css\"></head>");
            if (page.equals("app.html")) html = html.replace("</body>", "<link rel=\"stylesheet\" href=\"/charts.css\"><script src=\"/charts.js\"></script></body>");
            if (page.equals("insights.html")) html = html.replace("</body>", "<link rel=\"stylesheet\" href=\"/insights-chart.css\"><script src=\"/insights-chart.js\"></script></body>");
            content = html.getBytes(StandardCharsets.UTF_8);
        }
        send(e, 200, type + "; charset=utf-8", content);
    }

    private static int extractInt(String body, String key) {
        var m = java.util.regex.Pattern.compile("\\\"" + key + "\\\"\\s*:\\s*(\\d+)").matcher(body);
        return m.find() ? Integer.parseInt(m.group(1)) : 0;
    }
    private static String extractString(String body, String key) {
        var m = java.util.regex.Pattern.compile("\\\"" + key + "\\\"\\s*:\\s*\\\"([^\\\"]*)").matcher(body);
        return m.find() ? m.group(1) : "";
    }
    private static String escapeJson(String value) { return value.replace("\\", "\\\\").replace("\"", "\\\""); }
    private static void json(HttpExchange e, int status, String body) throws IOException { send(e, status, "application/json; charset=utf-8", body.getBytes(StandardCharsets.UTF_8)); }
    private static void send(HttpExchange e, int status, String type, byte[] body) throws IOException {
        e.getResponseHeaders().set("Content-Type", type); e.getResponseHeaders().set("Cache-Control", "no-store");
        e.sendResponseHeaders(status, body.length); try (OutputStream out = e.getResponseBody()) { out.write(body); }
    }
}
