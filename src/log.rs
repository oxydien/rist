/* ```rust,norun
use crate::{
  log::{LogLevel, Logger},
  log_e, log_x,
};
``` */

use std::io::Write;

use colored::*;

// Currently set to constant, will be changed later
const LOG_FILE: &str = "log.txt";
const LOG_FILE_LEVEL: LogLevel = LogLevel::Debug;

#[derive(Debug, Clone)]
pub enum LogLevel {
  Dev = 9,
  Debug = 0,
  Info = 1,
  Warning = 2,
  Error = 3,
}

impl ToString for LogLevel {
  fn to_string(&self) -> String {
    match self {
      LogLevel::Dev => String::from("DEV"),
      LogLevel::Debug => String::from("DEBUG"),
      LogLevel::Info => String::from("INFO"),
      LogLevel::Warning => String::from("WARN"),
      LogLevel::Error => String::from("ERROR"),
    }
  }
}

pub struct Logger {
  level: LogLevel,
}

impl Logger {
  pub fn new(level: LogLevel) -> Self {
    Logger { level }
  }

  pub fn log<T: std::fmt::Debug + ToString>(&self, message: T, caller: &str) {
    let level_color = match self.level {
      LogLevel::Dev => "magenta",
      LogLevel::Debug => "green",
      LogLevel::Info => "blue",
      LogLevel::Warning => "yellow",
      LogLevel::Error => "red",
    };

    if self.level.clone() as u8 >= LOG_FILE_LEVEL as u8 {
      self.write_to_file(&message, caller);
    }

    let display_message: String = message.to_string();
    println!(
      "[{:<20}] {:<6}: {}",
      caller.truecolor(120, 120, 120),
      self.level.to_string().color(level_color).bold(),
      display_message
    );
  }

  fn write_to_file<T: std::fmt::Debug + ToString>(&self, message: &T, caller: &str) {
    let mut log_file = std::fs::OpenOptions::new()
      .create(true)
      .append(true)
      .open(LOG_FILE)
      .unwrap();

    let content = format!(
      "[{:<20}] {:<6}: {}\n",
      caller,
      self.level.to_string(),
      message.to_string()
    );
    log_file.write_all(content.as_bytes()).unwrap();
    if let Err(why) = log_file.flush() {
      println!("Error flushing log file: {}", why);
    }
  }
}

#[macro_export]
macro_rules! log_x {
  ($level:expr, $message:expr) => {{
    let caller = file!();
    let logger = crate::log::Logger::new($level);
    logger.log($message, caller);
  }};
}

#[macro_export]
macro_rules! log_d {
    ($message:expr) => {
      crate::log_x!(crate::log::LogLevel::Debug, $message)
    };
    ($message:expr, $($arg:expr),+) => {
      crate::log_x!(crate::log::LogLevel::Debug, format!($message, $($arg),*))
    }
}

#[macro_export]
macro_rules! log_i {
  ($message:expr) => {
    crate::log_x!(crate::log::LogLevel::Info, $message)
  };
  ($message:expr, $($arg:expr),+) => {
    crate::log_x!(crate::log::LogLevel::Info, format!($message, $($arg),*))
  }
}

#[macro_export]
macro_rules! log_w {
  ($message:expr) => {
    crate::log_x!(crate::log::LogLevel::Warning, $message)
  };
  ($message:expr, $($arg:expr),+) => {
    crate::log_x!(crate::log::LogLevel::Warning, format!($message, $($arg),*))
  }
}

#[macro_export]
macro_rules! log_e {
  ($message:expr) => {
    crate::log_x!(crate::log::LogLevel::Error, $message)
  };
  ($message:expr, $($arg:expr),+) => {
    crate::log_x!(crate::log::LogLevel::Error, format!($message, $($arg),*))
  };
}

#[macro_export]
macro_rules! err_none {
  ($option:expr, $message:expr) => {
    match $option {
      Some(value) => value,
      None => {
        crate::log_e!($message);
        panic!($message);
      }
    }
  };
  ($option:expr, $message:expr, $default:expr) => {
    match $option {
      Some(value) => value,
      None => {
        crate::log_e!($message);
        $default
      }
    }
  };
}

#[macro_export]
macro_rules! warn_none {
  ($option:expr, $message:expr) => {
    match $option {
      Some(value) => value,
      None => {
        crate::log_w!($message);
        panic!($message);
      }
    }
  };
  ($option:expr, $message:expr, $default:expr) => {
    match $option {
      Some(value) => value,
      None => {
        crate::log_w!($message);
        $default
      }
    }
  };
}
