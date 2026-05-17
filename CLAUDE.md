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

## 現在の状態（2026-05-17）

✅ **完成した機能**
- コアゲーム（ドラッグ&ドロップ配置、リアルタイム採点）
- トッピング 17種（通常11種 + プレミアム6種）
- 4層合成BGM（ベルメロディ・パッド・ベース・シェイカー、リバーブ付き）
- 効果音（ピックアップ・配置・削除・アンロック・完成など）
- iOS/Android音声アンロック対応（無音バッファ + ドキュメント層イベントキャプチャ）
- 結果画面・称号表示
- 日本語README.md（GitHub最適化）
- **Firebase Firestore グローバルランキング**（匿名認証、TOP50、結果カードから登録、HUDの🏆から閲覧）
- **マイギャラリー**（完成画像をlocalStorageに保存、HUDの📚から一覧、上限30件＝低スコア自動削除、PNGダウンロード対応）

## Firebase Firestore ランキング（実装済み）

### データモデル
```
/scores/{docId}
  - playerName: string (1-50字)
  - score: number (0-140以上)
  - timestamp: number (ミリ秒)
  - uid: string (Firebase UID)
```

### セキュリティルール
- 読み取り: すべてのユーザーが可能
- 書き込み: 匿名認証済みのみ、バリデーション付き（score数値、name長50字以下など）
- 削除/更新: 禁止

## マイギャラリー（実装済み）

### データモデル（localStorage キー: `pancakeDeco.gallery`）
```
[
  {
    id: string,           // crypto.randomUUID()
    image: string,        // JPEG dataURL (480x480, quality 0.85)
    score: number,
    rank: string,         // 例: "本格派 ★★★★"
    breakdown: { coverage, balance, spread, overflow, bonus },
    timestamp: number,    // ミリ秒
  },
  ...
]
```

- 上限 30 件、超えたら最低スコア優先で自動削除
- 完成時に `js/gallery.js#snapshotPancake` でスナップショット生成
- 詳細モーダルから PNG ダウンロード（JPEG 出力だが拡張子 .jpg）
- クラウド同期なし、端末ローカル限定

## ファイル構成

```
そまそま/
├── index.html              # ゲーム画面 + ランキング/ギャラリー UI
├── style.css               # スタイル（モーダル含む）
├── README.md               # GitHub 用ドキュメント
├── CLAUDE.md               # このファイル
└── js/
    ├── main.js             # メインループ・状態管理・全UIハンドラ
    ├── draw.js             # Canvas 描画関数
    ├── toppings.js         # 17種トッピング定義
    ├── input.js            # マウス/タッチ入力
    ├── score.js            # 採点アルゴリズム
    ├── audio.js            # BGM・効果音合成
    ├── firebase-config.js  # Firebase コンフィグ
    ├── ranking.js          # Firestore ランキング管理
    └── gallery.js          # localStorage ギャラリー + スナップショット生成
```

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

## 今後の拡張アイデア

- ギャラリーのクラウド同期（IndexedDB → Firebase Storage 連携）
- ランキングのスコア改ざん検出（Cloud Functions で配置データを再採点して検証）
- 「ギャラリーから配置データを復元してもう一度」（現状は画像のみ保存）
- ギャラリー作品の SNS シェア（OGP対応の共有用URL生成）
