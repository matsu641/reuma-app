# ユーザーデータ分離の実装

## 実施した修正内容

### 1. 認証チェックの強化
- `DatabaseService.isUserLoggedIn()`: ユーザーIDの存在も確認
- `DatabaseService.getCurrentUserId()`: 新規追加
- `FirestoreService.getCurrentUserId()`: ユーザーIDのログ出力を追加

### 2. データ分離の強化
- 全てのFirestoreデータにユーザーIDを明示的に保存
- データ取得時にユーザーIDの整合性チェックを実装
- コレクションアクセス時のログ出力を追加

### 3. SQLiteデータベースの分離
- ユーザーごとに個別のSQLiteデータベースファイルを作成
- ログイン時: `rheuma_app_{userId}.db`
- ログアウト時: `rheuma_app.db` (共通)

### 4. 食事管理機能のFirestore対応 🆕
- `FoodInteractionService`をFirestoreに対応
- AsyncStorageからFirestoreへの自動マイグレーション
- ユーザーごとの食事記録分離
- 薬物相互作用チェックのユーザー固有データ対応

### 5. セッション管理の改善
- ログイン時にユーザー固有のデータベースに切り替え
- ログアウト時にデータベースをクリーンアップし、共通データベースに戻す
- 認証状態変更時の適切な初期化処理
- 食事記録マイグレーションの自動実行

### 6. データマイグレーション
- 既存データにユーザーIDを追加するマイグレーション機能
- AsyncStorageからFirestoreへの食事記録移行
- 新規ユーザープロファイル作成時に自動実行

## セキュリティ機能

### Firestore
- ユーザーのサブコレクション構造: `/users/{userId}/{collectionName}`
- 食事記録: `/users/{userId}/foodLogs/{logId}`
- セキュリティルールでユーザー自身のデータのみアクセス可能
- データ取得時の追加の整合性チェック

### SQLite
- ユーザーごとに完全に分離されたデータベースファイル
- ログアウト時の適切なクリーンアップ

## 食事管理機能の改善点

### データ保存先の自動選択
- **ログイン時**: Firestoreにユーザー固有データとして保存
- **ログアウト時**: ローカルSQLiteに一時保存

### マイグレーション機能
- 既存のAsyncStorageデータを自動的にFirestoreに移行
- 移行後はローカルデータを安全にクリーンアップ
- 移行エラー時のフォールバック処理

### データ構造
```javascript
/users/{userId}/foodLogs/{logId}
{
  foods: ['食品1', '食品2'],
  mealTime: 'breakfast|lunch|dinner|snack|other',
  interactions: [
    {
      medication: '薬剤名',
      food: '食品名',
      severity: 'high|medium|low',
      reason: '相互作用の理由',
      action: '推奨アクション'
    }
  ],
  timestamp: Date,
  userId: 'ユーザーID',
  createdAt: Date,
  updatedAt: Date
}
```

## ログとデバッグ

### 追加されたログ
- ユーザーID付きでのデータアクセスログ
- データ所有権ミスマッチの警告
- データベース切り替えのログ
- マイグレーション実行ログ
- 食事記録のFirestore保存ログ

### 監視ポイント
- コンソールで以下を確認:
  - `Current user ID: {userId}`
  - `Accessing collection '{collectionName}' for user: {userId}`
  - `Retrieved {count} {dataType} for user: {userId}`
  - `Food log saved to Firestore: {docId}`
  - `Starting migration of {count} food logs to Firestore`
  - `Data ownership mismatch detected!` (問題がある場合)

## 使用方法

1. **新規ユーザー**: 初回ログイン時に自動的にユーザープロファイルとデータ構造が作成される
2. **既存ユーザー**: ログイン時にデータマイグレーションが自動実行される
3. **食事記録**: ログイン状態に応じて自動的にFirestoreまたはローカルストレージに保存
4. **データアクセス**: 全てのデータアクセスが自動的にユーザー固有のものに限定される
5. **ログアウト**: データベースが適切にクリーンアップされ、共通データベースに切り替わる

## 注意事項

- この実装により、各ユーザーのデータは完全に分離される
- 食事記録もユーザーごとに完全に分離される
- データの誤った共有は防止される
- 既存のアプリの動作に影響はない
- パフォーマンスに大きな影響はない
- マイグレーション処理は初回ログイン時のみ実行される
