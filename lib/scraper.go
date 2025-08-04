package lib

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

func (scraper *Scraper) Init(url string, client *fasthttp.Client) error {
	validatedUrl, err := scraper.validateUrl(url)

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

	scraper.url = validatedUrl
	scraper.root = root

	return nil
}

func (scraper *Scraper) validateUrl(rawUrl string) (*url.URL, error) {
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

func (scraper *Scraper) Find(selector string) *Element {
	element := scraper.root.Find(selector).First()

	if element.Length() == 0 {
		LogFail(fmt.Sprintf("No elements found for selector '%s'", selector))
		element = nil
	} else {
		LogSuccess(fmt.Sprintf("Found element for selector '%s'", selector))
	}

	return &Element{selection: element}
}

func (scraper *Scraper) GetOembed() (map[string]any, error) {
	oembedUrl := scraper.Find("link[rel='alternate'][type='application/json+oembed']").Attr("href")

	if oembedUrl != nil {
		LogSuccess("Detected oembed")

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
		LogInfo("Website doesn't seem to have oEmbed, skipping...")
		return nil, nil
	}

}

func (scraper *Scraper) GetFavicon() (*string, error) {
	favicon := scraper.Find("link[rel='icon']").Attr("href")

	if favicon == nil || *favicon == "" {
		favicon = scraper.Find("link[rel='shortcut icon']").Attr("href")

	}
	if favicon == nil || *favicon == "" {
		favicon = scraper.Find("link[rel='apple-touch-icon']").Attr("href")
	}

	if favicon != nil {
		LogSuccess(fmt.Sprintf("Favicon found in HTML → %s", *favicon))
		return favicon, nil

	} else {
		faviconUrl, err := url.JoinPath(scraper.url.Path, "/favicon.ico")

		if err != nil {
			return nil, err
		}

		res, err := http.Head(faviconUrl)

		if err != nil {
			return nil, err
		}

		if res.StatusCode >= 200 && res.StatusCode < 300 {
			LogSuccess("Fetched /favicon.ico")
			return &faviconUrl, nil
		}

		LogFail("No favicon found.")
		return nil, nil

	}
}
