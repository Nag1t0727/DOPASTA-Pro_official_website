# DOPASTA-Pro_official_website
4EJ DOPASTA Pro official website

# DOPASTA Pro 公式紹介サイト

HTML・CSS・JavaScriptのみで動作する紹介サイトです。アプリ本体とは独立しています。外部フォント・解析・Cookie・CDNライブラリは使用していません。

## ローカルで見る

このディレクトリで `python3 -m http.server 8080` を実行し、http://localhost:8080 を開きます。ビルドは不要です。

## GitHub Pages

1. GitHubの Settings → Pages → Build and deployment → Source で **GitHub Actions** を選びます。
2. このリポジトリの `main` にpushすると、同梱の `.github/workflows/pages.yml` がサイトを公開します。
3. 別名のブランチを使う場合は、ワークフローの `branches` を変更してください。

今回はコミット・push・公開操作は行っていません。相対パスを使用しているため、リポジトリ名付きの公開URLにも対応しています。

## 動作確認

初回は `npm install` と `npx playwright install chromium` を実行し、`npm test` で確認します。Chromeがインストール済みの場合は `PLAYWRIGHT_CHANNEL=chrome npm test` でも確認できます。テストサーバーにはPython 3を使用します。

## 編集する場所

- `index.html`：文章、ナビゲーション、FAQ、アプリへの導線
- `style.css`：ロゴ由来の5色、レイアウト、フォント
- `script.js`：スクロール量に応じたフェード、サンプル4択クイズ
- `assets/`：既存アプリ由来のロゴ・アイコン・背景

アプリの本番URLが未指定のため、「公開準備中」と表示し、CTAはページ内のクイズ体験へ案内しています。公開後は `#experience` の本文とCTAのリンク先を本番URLに変更してください。
チーム対戦・通知・チャットはブラウザ内デモであることを明記しています。画面内のタイマー・対戦グラフは説明用イメージです。

JavaScript無効時も本文・ナビ・FAQが表示されます。動きを減らす設定時はフェードを停止します。クイズ体験のみJavaScriptが必要です。

## 構成の参考

https://distinction.atsueigo.com/ の導入・特徴一覧・機能ごとの説明という流れを参考にしています。文章・画像・コードは転載せず、DOPASTA Pro向けに作成しています。
