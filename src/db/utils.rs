use sqlx::{sqlite::SqliteRow, Error, Row, SqlitePool};

use super::TableColumn;

/// Ensures that a table with the given name exists in the given database pool. If the table does not
/// exist, it is created with the given columns. If the table already exists, missing columns are added.
///
/// # Errors
/// If the table cannot be created or the columns cannot be added, an [sqlx::Error] is returned.
///
pub(crate) async fn ensure_table_schema(
  pool: &SqlitePool,
  table_name: &str,
  columns: &[TableColumn],
) -> Result<(), Error> {
  let mut transaction = pool.begin().await?;

  // Check if the table exists
  let table_exists: bool = sqlx::query(&format!(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='{}'",
    table_name
  ))
  .fetch_one(&mut *transaction)
  .await
  .is_ok();

  if !table_exists {
    // Build the CREATE TABLE statement
    let mut create_table_query = format!("CREATE TABLE {} (", table_name);
    for column in columns {
      create_table_query += &format!("{} {}", column.name, column.data_type);
      if let Some(default_value) = column.default_value {
        create_table_query += &format!(" DEFAULT {}", default_value);
      }
      create_table_query += ",";
    }
    create_table_query.pop(); // Remove the last ", "
    create_table_query += ");";

    // Execute the CREATE TABLE statement
    println!("[DEBUG ] Creating table '{}' {}", table_name, create_table_query.clone());
    sqlx::query(&create_table_query)
      .execute(&mut *transaction)
      .await?;
    println!("[DEBUG ] Created table '{}'", table_name);
  } else {
    // Get the existing column names
    // PRAGMA might be problematic, keep an eye on it (tested)
    let existing_columns: Vec<String> = sqlx::query(&format!("PRAGMA table_info({})", table_name))
      .map(|row: SqliteRow| row.get(1))
      .fetch_all(&mut *transaction)
      .await?
      .into_iter()
      .collect();

    // Add missing columns
    for column in columns {
      if !existing_columns.contains(&column.name.to_string()) {
        println!(
          "[DEBUG ] Adding column '{}' of type '{}'",
          column.name, column.data_type
        );

        // If column is NOT NULL, we need to provide a default value
        let mut column_def = format!("{} {}", column.name, column.data_type);

        // Check if it's a NOT NULL column
        if column.data_type.contains("NOT NULL") {
          // Use the provided default value or a type-appropriate default
          if let Some(default_value) = column.default_value {
            column_def += &format!(" DEFAULT {}", default_value);
          } else {
            // Add appropriate default based on column type
            let default_value = if column.data_type.starts_with("INTEGER") {
              "DEFAULT 0"
            } else if column.data_type.starts_with("TEXT") {
              "DEFAULT ''"
            } else if column.data_type.starts_with("REAL") {
              "DEFAULT 0.0"
            } else if column.data_type.starts_with("BLOB") {
              "DEFAULT X''"
            } else {
              "DEFAULT NULL"
            };
            column_def += &format!(" {}", default_value);
          }
        }

        // Add the column with the appropriate definition
        sqlx::query(&format!(
          "ALTER TABLE {} ADD COLUMN {}",
          table_name, column_def
        ))
        .execute(&mut *transaction)
        .await?;

        // If a specific default value was provided and it's different from the temporary default,
        // update the column with the desired value
        if let Some(default_value) = column.default_value {
          sqlx::query(&format!(
            "UPDATE {} SET {} = {}",
            table_name, column.name, default_value
          ))
          .execute(&mut *transaction)
          .await?;
        }

        println!(
          "[DEBUG ] Added column '{}' with definition '{}'",
          column.name, column_def
        );
      }
    }
  }

  transaction.commit().await?;
  Ok(())
}
