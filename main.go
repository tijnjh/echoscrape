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

	httpClient := &fasthttp.Client{ReadBufferSize: 32 * 1024}

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

		s, err := scraper.New(scraper.Config{
			Url:        path,
			HttpClient: httpClient,
		})

		if err != nil {
			return err
		}

		favicon, err := s.GetFavicon()

		if err != nil {
			logger.Fail(fmt.Sprintf("Failed to get favicon: %v", err))
			favicon = nil
		}

		oembed, err := s.GetOembed()

		if err != nil {
			logger.Fail(fmt.Sprintf("Failed to get oembed: %v", err))
			oembed = nil
		}

		metadata := map[string]any{
			"title":       s.Find("title").Text(),
			"description": s.Find("meta[name='description']").Attr("content"),
			"favicon":     favicon,
			"themeColor":  s.Find("meta[name='theme-color']").Attr("content"),
			"og": map[string]any{
				"title":       s.Find("meta[property='og:title']").Attr("content"),
				"description": s.Find("meta[property='og:description']").Attr("content"),
				"image":       s.Find("meta[property='og:image']").Attr("content"),
				"imageAlt":    s.Find("meta[property='og:image:alt']").Attr("content"),
				"imageWidth":  s.Find("meta[property='og:image:width']").Attr("content"),
				"imageHeight": s.Find("meta[property='og:image:height']").Attr("content"),
				"url":         s.Find("meta[property='og:url']").Attr("content"),
				"type":        s.Find("meta[property='og:type']").Attr("content"),
				"siteName":    s.Find("meta[property='og:site_name']").Attr("content"),
			},
			"twitter": map[string]any{
				"title":       s.Find("meta[name='twitter:title']").Attr("content"),
				"description": s.Find("meta[name='twitter:description']").Attr("content"),
				"image":       s.Find("meta[name='twitter:image']").Attr("content"),
				"site":        s.Find("meta[name='twitter:site']").Attr("content"),
				"card":        s.Find("meta[name='twitter:card']").Attr("content"),
			},
			"oembed": oembed,
		}

		utils.CleanNil(metadata)
		return c.JSON(metadata)
	})

	app.Listen(":3000")
}
