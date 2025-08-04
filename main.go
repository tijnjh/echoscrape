package main

import (
	"echoscrape/lib/logger"
	"echoscrape/lib/scraper"
	"echoscrape/lib/utils"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/valyala/fasthttp"
)

func main() {
	app := fiber.New()

	app.Use(cors.New())

	app.Get("/", func(c *fiber.Ctx) error {
		err := c.JSON(fiber.Map{
			"instruction": fmt.Sprintf("Go to %s{your-url}", c.OriginalURL()),
			"echoscrape": fiber.Map{
				"source": "https://github.com/tijnjh/echoscrape",
			},
		})

		return err
	})

	app.Get("/*", func(c *fiber.Ctx) error {
		path := strings.TrimPrefix(c.Path(), "/")

		scraper := &scraper.Scraper{}

		if err := scraper.Init(path, &fasthttp.Client{ReadBufferSize: 32 * 1024}); err != nil {
			return err
		}

		favicon, err := scraper.GetFavicon()

		if err != nil {
			logger.Fail(fmt.Sprintf("Failed to get favicon: %v", err))
			favicon = nil
		}

		oembed, err := scraper.GetOembed()

		if err != nil {
			logger.Fail(fmt.Sprintf("Failed to get oembed: %v", err))
			oembed = nil
		}

		metadata := map[string]any{
			"title":       scraper.Find("title").Text(),
			"description": scraper.Find("meta[name='description']").Attr("content"),
			"favicon":     favicon,
			"themeColor":  scraper.Find("meta[name='theme-color']").Attr("content"),
			"og": map[string]any{
				"title":       scraper.Find("meta[property='og:title']").Attr("content"),
				"description": scraper.Find("meta[property='og:description']").Attr("content"),
				"image":       scraper.Find("meta[property='og:image']").Attr("content"),
				"imageAlt":    scraper.Find("meta[property='og:image:alt']").Attr("content"),
				"imageWidth":  scraper.Find("meta[property='og:image:width']").Attr("content"),
				"imageHeight": scraper.Find("meta[property='og:image:height']").Attr("content"),
				"url":         scraper.Find("meta[property='og:url']").Attr("content"),
				"type":        scraper.Find("meta[property='og:type']").Attr("content"),
				"siteName":    scraper.Find("meta[property='og:site_name']").Attr("content"),
			},
			"twitter": map[string]any{
				"title":       scraper.Find("meta[name='twitter:title']").Attr("content"),
				"description": scraper.Find("meta[name='twitter:description']").Attr("content"),
				"image":       scraper.Find("meta[name='twitter:image']").Attr("content"),
				"site":        scraper.Find("meta[name='twitter:site']").Attr("content"),
				"card":        scraper.Find("meta[name='twitter:card']").Attr("content"),
			},
			"oembed": oembed,
		}

		utils.CleanNil(metadata)
		return c.JSON(metadata)
	})

	app.Listen(":3000")
}
