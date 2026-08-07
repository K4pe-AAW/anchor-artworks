#!/bin/zsh
# ダブルクリックでAnchor Art Works Adminを起動する。
# ローカルDB（prisma dev）を起動 → 開発サーバー起動 → ブラウザを自動で開く。
# 終了するときはこのウィンドウで Ctrl+C を押してください。

cd "$(dirname "$0")"

echo "ローカルDBを起動しています..."
npx prisma dev -d --name aaw-admin-dev >/tmp/aaw-admin-dbstart.log 2>&1

echo "起動を待っています..."
sleep 3

( sleep 4 && open "http://localhost:3000" ) &

echo ""
echo "Anchor Art Works Admin を起動しています..."
echo "終了するには、このウィンドウで Ctrl+C を押してください。"
echo ""
npm run dev
