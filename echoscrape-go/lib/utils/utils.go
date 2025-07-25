package utils

import (
	"github.com/PuerkitoBio/goquery"
)

func GetAttr(selection *goquery.Selection, name string) *string {
	val, exists := selection.Attr(name)

	if !exists {
		return nil
	}

	return &val
}
