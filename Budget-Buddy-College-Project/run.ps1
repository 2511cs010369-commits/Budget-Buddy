$ErrorActionPreference = 'Stop'
if (Test-Path '.env') {
    Get-Content '.env' | ForEach-Object {
        if ($_ -match '^\s*([^#][A-Z0-9_]*)\s*=\s*(.*)\s*$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2].Trim('"'), 'Process')
        }
    }
}
New-Item -ItemType Directory -Force -Path 'out' | Out-Null
javac -d out src/main/java/com/budgetbuddy/SimpleBudgetBuddyServer.java
java -cp out com.budgetbuddy.SimpleBudgetBuddyServer
