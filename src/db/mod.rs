pub mod file;
pub mod user;
pub mod utils;
pub mod video;

pub(crate) struct TableColumn {
  name: &'static str,
  data_type: &'static str,
  default_value: Option<&'static str>,
}
