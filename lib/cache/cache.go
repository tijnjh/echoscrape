package cache

import (
	"echoscrape/lib/logger"
	"fmt"
)

type Cache struct {
	cacheMap map[string]any
}

func New() *Cache {
	c := &Cache{make(map[string]any)}
	return c
}

func (c *Cache) Get(key string) (any, bool) {
	item, exists := c.cacheMap[key]

	if !exists {
		logger.Fail(fmt.Sprintf("(cache) Cache miss for '%s'...", key))
		return nil, false
	}

	logger.Success(fmt.Sprintf("(cache) Cache hit for '%s'. Returning cached data.", key))

	return item, true
}

func (c *Cache) Set(key string, val any) {
	c.cacheMap[key] = val
	logger.Success(fmt.Sprintf("(cache) Data cached for '%s'.", key))
}
