# ホットケーキデコレーションゲーム - プロジェクトガイド

## プロジェクト概要

ホットケーキ1枚をデコレーションするブラウザゲーム。周囲のお皿からトッピングをドラッグしてホットケーキに置き、盛り付けのバランスでグレード（0～140点以上）が算出される。グレード100超でプレミアムトッピングが解放される。

**技術スタック**
- Vanilla JavaScript + HTML5 Canvas（画像アセットなし、フルプロシージャル描画）
- Web Audio API（シンセサイズドBGM・効果音、外部音源ファイルなし）
- ES Modules（ビルド不要、ファイルURL可）
- Pointer Events API（マウス・タッチ統一）
- 予定: Firebase Firestore グローバルランキング

**デプロイ先**
- GitHub Pages: https://shinultra.github.io/pancake-decoration-game/
- リポジトリ: https://github.com/shinultra/pancake-decoration-game

## 現在の状態（2026-05-16）

✅ **完成した機能**
- コアゲーム（ドラッグ&ドロップ配置、リアルタイム採点）
- トッピング 17種（通常11種 + プレミアム6種）
- 4層合成BGM（ベルメロディ・パッド・ベース・シェイカー、リバーブ付き）
- 効果音（ピックアップ・配置・削除・アンロック・完成など）
- iOS/Android音声アンロック対応（無音バッファ + ドキュメント層イベントキャプチャ）
- 結果画面・称号表示
- 日本語README.md（GitHub最適化）

⏳ **進行中: Firebase Firestoreランキングシステム**

Firebase Console セットアップ進捗:
- ✅ プロジェクト作成: `pancake-decoration`
- ✅ Firestore Database 作成 (リージョン: `asia-northeast1` / 東京、本番モード)
- ⏳ Authentication: 匿名サインインの有効化 (作業中)
- ⏳ 承認済みドメインに `shinultra.github.io` を追加 (作業中)
- ⏳ Web アプリ登録 → firebaseConfig 取得 (未着手)
- ⏳ セキュリティルール反映 (未着手)
- ⏳ コード実装 (firebaseConfig 受領後に開始)

## Firebase Firestore ランキングの実装予定

### 必要なファイル
1. `js/firebase-config.js` - firebaseConfig をエクスポート
2. `js/ranking.js` - Firestore ラッパー関数（submitScore, fetchTopScores）
3. `index.html` 更新 - ランキング表示UI（モーダル、テーブル、🏆ボタン）
4. `js/main.js` 更新 - ランキング画面の状態管理
5. `style.css` 更新 - モーダル・テーブルスタイル
6. `README.md` 更新 - ランキング機能の説明

### セキュリティルール
- 読み取り: すべてのユーザーが可能
- 書き込み: 匿名認証済みのみ、バリデーション付き（score数値、name長50字以下など）
- 削除/更新: 禁止

### データモデル
```
/scores/{docId}
  - playerName: string (1-50字)
  - score: number (0-140以上)
  - timestamp: number (ミリ秒)
  - uid: string (Firebase UID)
```

## ファイル構成

```
そまそま/
├── index.html              # ゲーム画面 + ランキング UI（予定）
├── style.css               # スタイル（モーダル含む）
├── README.md               # GitHub 用ドキュメント
├── CLAUDE.md               # このファイル
└── js/
    ├── main.js             # メインループ・状態管理
    ├── draw.js             # Canvas 描画関数
    ├── toppings.js         # 17種トッピング定義
    ├── input.js            # マウス/タッチ入力
    ├── score.js            # 採点アルゴリズム
    ├── audio.js            # BGM・効果音合成
    ├── firebase-config.js  # Firebase コンフィグ（予定）
    └── ranking.js          # Firestore ランキング管理（予定）
```

## 作業ステップ（ランキング実装）

1. ユーザーが Firebase Console で全セットアップ完了 → firebaseConfig を提供
2. `js/firebase-config.js` を作成（firebaseConfig をエクスポート）
3. `js/ranking.js` を実装（Firestore CRUD + 匿名認証）
4. `index.html` にランキング UI 追加（完成後に表示モーダル）
5. `js/main.js` にランキング状態・ハンドラ統合
6. `style.css` にモーダル・テーブルスタイル追加
7. `README.md` にランキング説明を追加
8. 動作確認 → GitHub にプッシュ → GitHub Pages で自動デプロイ

## 重要な注記

- **言語**: 日本語対応（UI・README）
- **環境**: ファイルURL もしくは `python3 -m http.server` で検証
- **モバイル**: iPhone/iPad の場合、本体側面のサイレントスイッチを OFF にする必要あり（Safari の仕様）
- **ビルド不要**: ES Modules を直接読み込み、CDN（Firebase SDK）から import
- **GitHub Pages**: 静的ホスティング、自動デプロイ対応

## Firebase プロジェクト情報

- **プロジェクト ID**: `pancake-decoration`
- **コンソール**: https://console.firebase.google.com/project/pancake-decoration/overview
- **Firestore リージョン**: `asia-northeast1` (東京、変更不可)
- **Firestore モード**: 本番モード (テストモードではない)
- **料金プラン**: Spark (無料枠)

## 次のアクション

1. Authentication で「匿名」サインインを有効化
2. Authentication → Settings → 承認済みドメインに `shinultra.github.io` を追加
3. プロジェクト設定 → Web アプリ登録 (Hosting なし) → `firebaseConfig` 取得
4. Firestore → ルールタブにセキュリティルールを貼り付けて公開
5. `firebaseConfig` を Claude に提供
6. `js/firebase-config.js` → `js/ranking.js` → UI 統合の順に実装
