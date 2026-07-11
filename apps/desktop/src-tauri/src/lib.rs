/// 应用入口：注册插件并启动 Tauri 运行时
///
/// 当前注册的插件：
/// - dialog: 提供原生文件/文件夹选择对话框
/// - fs: 提供文件读取与目录扫描能力（课程资源导入）
/// - store: 提供 JSON 键值存储（课程库、学习进度、应用设置）
/// - updater: 应用内检查/下载/安装更新（GitHub Releases 分发）
/// - process: 更新安装完成后重启应用
/// - opener: 在系统浏览器打开外部链接（用户反馈入口）
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
