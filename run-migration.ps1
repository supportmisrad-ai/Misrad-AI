# Load environment variables
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "env:$name" -Value $value -Force
    }
}

# Use db push instead of migrate (avoids shadow database issues)
npx prisma db push --schema prisma/schema.prisma --accept-data-loss
