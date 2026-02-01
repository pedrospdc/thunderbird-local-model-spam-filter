XPI = ai-spam-filter.xpi

.PHONY: build clean test

build:
	cd extension && zip -r ../$(XPI) .

test:
	node --test test/

clean:
	rm -f $(XPI)
