package logger

import (
	"fmt"

	"github.com/fatih/color"
)

func Success(message string) {
	green := color.New(color.FgGreen)
	fmt.Printf("%s %s\n", green.Sprint("✔"), message)
}

func Fail(message string) {
	red := color.New(color.FgRed)
	fmt.Printf("%s %s\n", red.Sprint("✖"), message)
}

func Info(message string) {
	blue := color.New(color.FgBlue)
	fmt.Printf("%s %s\n", blue.Sprint("ℹ"), message)
}
