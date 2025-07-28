package main

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

func main() {
	app := fiber.New()

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
		path := strings.TrimPrefix(c.Path(), "/")

		s := &Scraper{}

		if err := s.Init(path); err != nil {
			return err
		}

		favicon, err := s.GetFavicon()

		if err != nil {
			fmt.Printf("Failed to get favicon: %v\n", err)
			favicon = nil
		}

		oembed, err := s.GetOembed()

		if err != nil {
			fmt.Printf("Failed to get oembed: %v\n", err)
			oembed = nil
		}

		var metadata = map[string]any{
			"title":       s.Q("title").Text(),
			"description": GetAttr(s.Q("meta[name='description']"), "content"),
			"favicon":     favicon,
			"themeColor":  GetAttr(s.Q("meta[name='theme-color']"), "content"),
			"og": map[string]any{
				"title":       GetAttr(s.Q("meta[property='og:title']"), "content"),
				"description": GetAttr(s.Q("meta[property='og:description']"), "content"),
				"image":       GetAttr(s.Q("meta[property='og:image']"), "content"),
				"imageAlt":    GetAttr(s.Q("meta[property='og:image:alt']"), "content"),
				"imageWidth":  GetAttr(s.Q("meta[property='og:image:width']"), "content"),
				"imageHeight": GetAttr(s.Q("meta[property='og:image:height']"), "content"),
				"url":         GetAttr(s.Q("meta[property='og:url']"), "content"),
				"type":        GetAttr(s.Q("meta[property='og:type']"), "content"),
				"siteName":    GetAttr(s.Q("meta[property='og:site_name']"), "content"),
			},
			"twitter": map[string]any{
				"title":       GetAttr(s.Q("meta[name='twitter:title']"), "content"),
				"description": GetAttr(s.Q("meta[name='twitter:description']"), "content"),
				"image":       GetAttr(s.Q("meta[name='twitter:image']"), "content"),
				"site":        GetAttr(s.Q("meta[name='twitter:site']"), "content"),
				"card":        GetAttr(s.Q("meta[name='twitter:card']"), "content"),
			},
			"oembed": oembed,
		}

		CleanNil(metadata)
		return c.JSON(metadata)
	})

	app.Listen(":3000")
}
