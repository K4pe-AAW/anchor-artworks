#!/bin/zsh
# ダブルクリック（またはDockのAAW Adminアイコン）から起動されるスクリプト。
# ローカルDB（Docker Compose上のPostgres）を起動 → 開発サーバー起動 → ブラウザを自動で開く。
# 終了するときはこのウィンドウで Ctrl+C を押してください。

cd "/Users/koh/Desktop/claude01/aaw-admin"

# Docker Desktop付属のCLIはデフォルトのPATHに入らないことがあるため明示的に追加する。
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

if ! command -v docker >/dev/null 2>&1; then
  echo "Dockerが見つかりません。Docker Desktopを起動してから再度お試しください。"
  read -p "Enterキーで終了..."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker Desktopが起動していません。Docker Desktopアプリを起動してから再度お試しください。"
  read -p "Enterキーで終了..."
  exit 1
fi

echo "ローカルDB（Docker Compose）を起動しています..."
docker compose up -d db

echo "DBの起動を待っています..."
until docker compose ps db --format json 2>/dev/null | grep -q '"Health":"healthy"'; do
  sleep 2
done
echo "DB起動完了。"

( sleep 4 && open "http://localhost:3000" ) &

echo ""
echo "Anchor Art Works Admin を起動しています..."
echo "終了するには、このウィンドウで Ctrl+C を押してください（DBはバックグラウンドで動き続けます）。"
echo ""
npm run dev
