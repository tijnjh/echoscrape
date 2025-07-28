package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"

	"github.com/PuerkitoBio/goquery"
	"github.com/valyala/fasthttp"
)

type Scraper struct {
	url  *url.URL
	root *goquery.Document
}

func (s *Scraper) Init(url string) error {
	validatedUrl, err := s.validateUrl(url)
	if err != nil {
		return err
	}

	client := &fasthttp.Client{
		ReadBufferSize: 32 * 1024,
	}
	statusCode, body, err := client.Get(nil, validatedUrl.String())

	if err != nil {
		return err
	}

	if statusCode != fasthttp.StatusOK {
		return fmt.Errorf("unexpected status code: %d", statusCode)
	}

	reader := bytes.NewReader(body)
	root, err := goquery.NewDocumentFromReader(reader)
	if err != nil {
		return err
	}

	s.url = validatedUrl
	s.root = root

	return nil
}

func (s *Scraper) validateUrl(rawUrl string) (*url.URL, error) {
	parsedURL, err := url.Parse(rawUrl)

	if err != nil {
		return nil, err
	}

	if parsedURL.Scheme == "" {
		parsedURL.Scheme = "http"
	}

	if parsedURL.Hostname() == "localhost" || parsedURL.Hostname() == "127.0.0.1" || parsedURL.Hostname() == "::1" {
		return nil, fmt.Errorf("access to localhost is not allowed")
	}

	return parsedURL, nil
}

func (s *Scraper) Q(selector string) *goquery.Selection {
	element := s.root.Find(selector).First()

	if element.Length() == 0 {
		fmt.Printf("%s: No element found\n", selector)
	} else {
		fmt.Printf("%s: Found element\n", selector)
	}

	return element
}

func (s *Scraper) GetOembed() (map[string]any, error) {
	var oembedUrl = GetAttr(s.Q("link[rel='alternate'][type='application/json+oembed']"), "href")

	if oembedUrl != nil {
		fmt.Println("Detected oembed")

		res, err := http.Get(*oembedUrl)

		if err != nil {
			return nil, err
		}

		defer res.Body.Close()

		var oembedMap map[string]any

		err = json.NewDecoder(res.Body).Decode(&oembedMap)

		if err != nil {
			return nil, err
		}

		return oembedMap, nil

	} else {
		fmt.Println("Website doesn't seem to have oEmbed, skipping...")
		return nil, nil
	}

}

func (s *Scraper) GetFavicon() (*string, error) {
	var favicon = GetAttr(s.Q("link[rel='icon']"), "href")

	if favicon == nil || *favicon == "" {
		favicon = GetAttr(s.Q("link[rel='shortcut icon']"), "href")

	}
	if favicon == nil || *favicon == "" {
		favicon = GetAttr(s.Q("link[rel='apple-touch-icon']"), "href")
	}

	if favicon != nil {
		fmt.Printf("Favicon found in HTML → %s\n", *favicon)
		return favicon, nil

	} else {
		faviconUrl, err := url.JoinPath(s.url.Path, "/favicon.ico")

		if err != nil {
			return nil, err
		}

		res, err := http.Head(faviconUrl)

		if err != nil {
			return nil, err
		}

		if res.StatusCode >= 200 && res.StatusCode < 300 {
			fmt.Println("Fetched /favicon.ico")
			return &faviconUrl, nil
		} else {
			fmt.Println("No favicon found.")
			return nil, nil
		}

	}
}
