actor Cache {
    private var cache: [String: Any] = [:]

    func tryCache<T>(key: String, callback: () async throws -> T) async throws -> T {
        if let cached = cache[key] as? T {
            Logger.success("Cache hit for '\(key)'. Returning cached data.")
            return cached
        }

        Logger.info("Cache miss for '\(key)'. Fetching data...")

        let data = try await callback()
        cache[key] = data

        Logger.success("Data cached for '\(key)'")
        return data
    }
}
