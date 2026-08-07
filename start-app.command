#!/bin/zsh
# ダブルクリックでAnchor Art Works Adminを起動する。
# ローカルDB（prisma dev）を起動 → 開発サーバー起動 → ブラウザを自動で開く。
# 終了するときはこのウィンドウで Ctrl+C を押してください。

cd "$(dirname "$0")"

# ローカルにインストール済みのprismaを直接呼ぶ（npx経由だと別バージョンの
# インストール確認プロンプトで無言のまま止まることがあるため）。
PRISMA_BIN="./node_modules/.bin/prisma"

if [ ! -x "$PRISMA_BIN" ]; then
  echo "依存パッケージが見つかりません。先に npm install を実行してください。"
  read -p "Enterキーで終了..."
  exit 1
fi

echo "ローカルDBを起動しています..."
# 対話プロンプトが出ても無言で固まらないよう標準入力を切り離す。
"$PRISMA_BIN" dev -d --name aaw-admin-dev < /dev/null > /tmp/aaw-admin-dbstart.log 2>&1

echo "起動を待っています..."
sleep 3

( sleep 4 && open "http://localhost:3000" ) &

echo ""
echo "Anchor Art Works Admin を起動しています..."
echo "終了するには、このウィンドウで Ctrl+C を押してください。"
echo ""
npm run dev
