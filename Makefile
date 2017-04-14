
.PHONY: clean diretories

MKDIR_P = mkdir -p
OUT_DIR = spatial_data/out
SRC_DIR = spatial_data/src

all: directories ${OUT_DIR}/federal_lands.geojson

directories: ${OUT_DIR} ${SRC_DIR}

${OUT_DIR}:
	mkdir -p ${OUT_DIR}

${SRC_DIR}:
	mkdir -p ${SRC_DIR}

${SRC_DIR}/fedlanp020.shp:
	cd ${SRC_DIR} && \
	curl -O https://dds.cr.usgs.gov/pub/data/nationalatlas/fedlanp020_nt00012.tar.gz && \
	tar -xvzf fedlanp020_nt00012.tar.gz && \
	cd -

${OUT_DIR}/federal_lands.geojson: ${SRC_DIR}/fedlanp020.shp
	ogr2ogr -f GeoJSON -t_srs crs:84 -s_srs crs:84 $@ $^

clean:
	rm -rf ${OUT_DIR}

clean-src:
	rm -rf ${SRC_DIR}
