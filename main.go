package main

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

func main() {
	var app = fiber.New()

	app.Use(cors.New())

	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"instruction": fmt.Sprintf("Go to %s{your-url}", c.OriginalURL()),
			"echoscrape": fiber.Map{
				"source": "https://github.com/tijnjh/echoscrape",
			},
		})
	})

	app.Get("/*", func(c *fiber.Ctx) error {
		var path = strings.TrimPrefix(c.Path(), "/")

		var scraper = &Scraper{}

		if err := scraper.Init(path); err != nil {
			return err
		}

		favicon, err := scraper.GetFavicon()

		if err != nil {
			fmt.Printf("Failed to get favicon: %v\n", err)
			favicon = nil
		}

		oembed, err := scraper.GetOembed()

		if err != nil {
			fmt.Printf("Failed to get oembed: %v\n", err)
			oembed = nil
		}

		var metadata = map[string]any{
			"title":       scraper.QuerySelector("title").Text(),
			"description": GetAttr(scraper.QuerySelector("meta[name='description']"), "content"),
			"favicon":     favicon,
			"themeColor":  GetAttr(scraper.QuerySelector("meta[name='theme-color']"), "content"),
			"og": map[string]any{
				"title":       GetAttr(scraper.QuerySelector("meta[property='og:title']"), "content"),
				"description": GetAttr(scraper.QuerySelector("meta[property='og:description']"), "content"),
				"image":       GetAttr(scraper.QuerySelector("meta[property='og:image']"), "content"),
				"imageAlt":    GetAttr(scraper.QuerySelector("meta[property='og:image:alt']"), "content"),
				"imageWidth":  GetAttr(scraper.QuerySelector("meta[property='og:image:width']"), "content"),
				"imageHeight": GetAttr(scraper.QuerySelector("meta[property='og:image:height']"), "content"),
				"url":         GetAttr(scraper.QuerySelector("meta[property='og:url']"), "content"),
				"type":        GetAttr(scraper.QuerySelector("meta[property='og:type']"), "content"),
				"siteName":    GetAttr(scraper.QuerySelector("meta[property='og:site_name']"), "content"),
			},
			"twitter": map[string]any{
				"title":       GetAttr(scraper.QuerySelector("meta[name='twitter:title']"), "content"),
				"description": GetAttr(scraper.QuerySelector("meta[name='twitter:description']"), "content"),
				"image":       GetAttr(scraper.QuerySelector("meta[name='twitter:image']"), "content"),
				"site":        GetAttr(scraper.QuerySelector("meta[name='twitter:site']"), "content"),
				"card":        GetAttr(scraper.QuerySelector("meta[name='twitter:card']"), "content"),
			},
			"oembed": oembed,
		}

		CleanNil(metadata)
		return c.JSON(metadata)
	})

	app.Listen(":3000")
}
