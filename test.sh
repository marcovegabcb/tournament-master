#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🧪 Running tests (Torneos.Tests)..."
echo ""

cd "$DIR/Torneos.Tests"
dotnet test --logger "console;verbosity=detailed"

echo ""
echo "✅ Done."
