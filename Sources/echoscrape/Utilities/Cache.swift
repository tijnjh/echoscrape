actor Cache {
    private var cache: [String: Any] = [:]

    func get<T>(key: String) -> T? {
        guard let item = cache[key] else {
            Logger.fail("(cache) Cache miss for '\(key)'...")
            return nil
        }

        Logger.success("(cache) Cache hit for '\(key)'. Returning cached data.")
        return item as? T
    }

    func set(key: String, val: Any) {
        self.cache[key] = val
        Logger.success("(cache) Data cached for '\(key)'.")
    }
}
