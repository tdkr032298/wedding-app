# Database

Supabaseで実行するSQLを保存するフォルダ。

## テーブル

- `guests`: ゲスト情報・ログイン判定
- `messages`: ゲストメッセージ
- `photos`: 投稿写真のURL管理
- `missions`: Mission一覧
- `mission_logs`: ゲストのMission実行履歴
- `seats`: 席次情報
- `tables`: 席次表の机配置・位置座標
- `timeline`: 当日のタイムスケジュール
- `profiles`: 新郎新婦プロフィール

## 実行順

1. `001_create_guests.sql`
2. `002_create_messages.sql`
3. `003_create_photos.sql`
4. `004_create_missions.sql`
5. `005_create_mission_logs.sql`
6. `006_create_seats.sql`
7. `007_create_tables.sql`
8. `008_create_timeline.sql`
9. `009_create_profiles.sql`
10. `101_table_policies.sql`
11. `201_storage_policies.sql`

## 番号ルール

- `001` - `099`: テーブル作成・カラム追加・index
- `101` - `199`: Table RLS policies
- `201` - `299`: Storage policies
