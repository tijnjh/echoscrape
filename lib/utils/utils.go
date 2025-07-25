package utils

import (
	"reflect"

	"github.com/PuerkitoBio/goquery"
)

func GetAttr(selection *goquery.Selection, name string) *string {
	val, exists := selection.Attr(name)

	if !exists {
		return nil
	}

	return &val
}

func CleanNil(m map[string]any) {
	for k, v := range m {
		if v == nil {
			delete(m, k)
			continue
		}
		rv := reflect.ValueOf(v)
		if rv.Kind() == reflect.Ptr && rv.Type().Elem().Kind() == reflect.String {
			if rv.IsNil() {
				delete(m, k)
				continue
			}
		}
		if subMap, ok := v.(map[string]any); ok {
			CleanNil(subMap)
			if len(subMap) == 0 {
				delete(m, k)
			}
		}
	}
}
