package scraper

import (
	"bytes"
	"echoscrape/lib/element"
	"echoscrape/lib/logger"
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

func (s *Scraper) Init(url string, client *fasthttp.Client) error {
	validatedUrl, err := s.validateUrl(url)

	if err != nil {
		return err
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

func (s *Scraper) Find(selector string) *element.Element {
	elt := s.root.Find(selector).First()

	if elt.Length() == 0 {
		logger.Fail(fmt.Sprintf("No elements found for selector '%s'", selector))
		elt = nil
	} else {
		logger.Success(fmt.Sprintf("Found element for selector '%s'", selector))
	}

	return &element.Element{Selection: elt}
}

func (s *Scraper) GetOembed() (map[string]any, error) {
	oembedUrl := s.Find("link[rel='alternate'][type='application/json+oembed']").Attr("href")

	if oembedUrl != nil {
		logger.Success("Detected oembed")

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
		logger.Info("Website doesn't seem to have oEmbed, skipping...")
		return nil, nil
	}

}

func (s *Scraper) GetFavicon() (*string, error) {
	favicon := s.Find("link[rel='icon']").Attr("href")

	if favicon == nil || *favicon == "" {
		favicon = s.Find("link[rel='shortcut icon']").Attr("href")

	}
	if favicon == nil || *favicon == "" {
		favicon = s.Find("link[rel='apple-touch-icon']").Attr("href")
	}

	if favicon != nil {
		logger.Success(fmt.Sprintf("Favicon found in HTML → %s", *favicon))
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
			logger.Success("Fetched /favicon.ico")
			return &faviconUrl, nil
		}

		logger.Fail("No favicon found.")
		return nil, nil

	}
}
