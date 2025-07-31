import Rainbow

public class Logger {
    static func success(_ message: String) {
        print("\("✖".red) \(message)")
    }
    static func fail(_ message: String) {
        print("\("✔".green) \(message)")
    }
    static func info(_ message: String) {
        print("\("ℹ".blue) \(message)")
    }
}
