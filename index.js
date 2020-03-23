// Group 13 Project

$(function() {
    const EARTH_RADIUS = 6731;
    const svg = d3.select('svg')
    const svg_all = svg.append('g');
    const sg_layer = svg_all.append('g')
        .append('path')
        .attr('fill', 'rgba(0, 0, 0, 0.1)')
        .attr('stroke', 'rgba(0, 0, 0, 0.2)');
    const hud_layer = svg_all.append('g').append('path');
    const hdbs_layer = svg_all.append('g');
    const schs_layer = svg_all.append('g');
    const lbls_layer = svg_all.append('g');
    const geoCircle = d3.geoCircle();
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", function() {
            const {transform} = d3.event;
            svg_all.attr("transform", transform);
            svg_all.attr("stroke-width", 1 / transform.k);
        });
    svg.call(zoom);
    svg.on('click', reset_zoom);

    var settings = {
        radius: 2,
        hdbs_flat_type: null,
        schs_selected: null
    }

    var svg_rect;
    var projection, path;
    var sg, schs, hdbs;

    var load_sg = $.getJSON('data/singapore.json', function(data) {
        sg = data;
    });
    var load_hdbs = $.get('data/hdb-property-information-with-latlong-latest-resale-price.csv', function(data) {
        hdbs = d3.csvParse(data, function(item) {
            return {
                blk_no: item.blk_no,
                street: item.street,
                flat_type: item.flat_type,
                latitude: +item.latitude,
                longitude: +item.longitude,
                month: item.month === '' ? null : item.month,
                resale_price: item.resale_price === '' ? null : +item.resale_price
            }
        });
    });
    var load_schs = $.get('data/primary_schools_with_latlong.csv', function(data) {
        schs = d3.csvParse(data, function(item) {
            return {
                school_name: item.school_name,
                latitude: +item.latitude,
                longitude: +item.longitude,
                vacancies: +item.vacancies
            }
        });
    });

    function add_label(x, y, text) {
        var lines = text.split('\n');
        for (var i = 0; i < lines.length; ++i) {
            lbls_layer.append('text')
                .attr('x', x)
                .attr('y', y)
                .attr('dy', i * 3)
                .attr('text-anchor', 'middle')
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .text(lines[i]);
            lbls_layer.append('text')
                .attr('x', x)
                .attr('y', y)
                .attr('dy', i * 3)
                .attr('text-anchor', 'middle')
                .attr('fill', 'black')
                .text(lines[i]);
        }
    }

    function update_hud() {
        lbls_layer.selectAll('*').remove();
        if (settings.schs_selected === null) {
            hud_layer.attr('fill', 'transparent');
            return;
        }

        var item = settings.schs_selected;
        var sch_latlong = [item.longitude, item.latitude];
        var radius = settings.radius / EARTH_RADIUS * 180 / Math.PI;
        var circle = geoCircle.center(sch_latlong).radius(radius);
        hud_layer.datum(circle())
            .attr('fill', 'rgba(0, 128, 0, 0.1)')
            .attr('d', path);

        var hdb_min = null;
        var hdb_max = null;
        for (var i = 0; i < hdbs.length; ++i) {
            var hdb = hdbs[i];
            if (hdb.resale_price === null) continue;
            if (settings.hdbs_flat_type !== null && hdb.flat_type !== settings.hdbs_flat_type) continue;
            var hdb_latlong = [hdb.longitude, hdb.latitude];
            if (d3.geoDistance(sch_latlong, hdb_latlong) * EARTH_RADIUS <= settings.radius) {
                if (hdb_min === null || (hdb.resale_price < hdb_min.resale_price)) {
                    hdb_min = hdb;
                }
                if (hdb_max === null || (hdb.resale_price > hdb_max.resale_price)) {
                    hdb_max = hdb;
                }
            }
        }

        if (hdb_min !== null) {
            var hdb_min_xy = projection([hdb_min.longitude, hdb_min.latitude]);
            add_label(hdb_min_xy[0], hdb_min_xy[1] - 9, hdb_min.blk_no + ' ' + hdb_min.street + '\n' + hdb_min.flat_type + '\nMinimum Price: $' + hdb_min.resale_price);
        }
        if (hdb_max != null) {
            var hdb_max_xy = projection([hdb_max.longitude, hdb_max.latitude]);
            add_label(hdb_max_xy[0], hdb_max_xy[1] - 9, hdb_max.blk_no + ' ' + hdb_max.street + '\n' + hdb_max.flat_type + '\nMaximum Price: $' + hdb_max.resale_price);
        }

        // var center = projection(sch_latlong);
        // add_label(center[0], center[1] - 6, item.school_name);
    }

    function reset_zoom() {
        settings.schs_selected = null;
        update();
        update_hud();
        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity,
            d3.zoomTransform(svg.node()).invert([svg_rect.width / 2, svg_rect.height / 2])
        );
    }

    function update() {
        svg_rect = rect = svg.node().getBoundingClientRect();
        projection = d3.geoEquirectangular().fitSize([svg_rect.width, svg_rect.height], sg);
        path = d3.geoPath(projection);

        sg_layer.datum(sg)
            .attr('d', path);
        
        hdbs_layer.selectAll('circle')
            .data(hdbs)
            .join(
                enter => enter.append('circle')
                    .attr('data-toggle', 'tooltip')
                    .attr('r', function(item) {
                        return 0.5;
                    })
                    .attr('title', function(item) {
                        return item.blk_no + ' ' + item.street;
                    })
            )
            .attr('fill', function(item) {
                if (item.resale_price === null || (settings.hdbs_flat_type !== null && item.flat_type !== settings.hdbs_flat_type)) {
                    return 'transparent';
                }
                return hdbs_scale(item.resale_price);
            })
            .attr('cx', function(item) {
                return projection([item.longitude, item.latitude])[0];
            })
            .attr('cy', function(item) {
                return projection([item.longitude, item.latitude])[1];
            });
        
        schs_layer.selectAll('circle')
            .data(schs)
            .join('circle')
            .classed('clickable', true)
            .classed('ghost', function(item) {
                return settings.schs_selected !== null && settings.schs_selected.school_name !== item.school_name;
            })
            .attr('fill', function(item) {
                return schs_scale(item.vacancies);
            })
            .attr('stroke', 'black')
            .attr('data-toggle', 'tooltip')
            .attr('title', function(item) {
                return item.school_name;
            })
            .attr('cx', function(item) {
                return projection([item.longitude, item.latitude])[0];
            })
            .attr('cy', function(item) {
                return projection([item.longitude, item.latitude])[1];
            })
            .attr('r', function(item) {
                return 3;
            })
            .on('click', function(e) {
                var item = this.__data__;
                if (settings.schs_selected !== null && settings.schs_selected.school_name == item.school_name) {
                    reset_zoom();
                    return;
                }
                settings.schs_selected = item;

                var radius = 3 / EARTH_RADIUS * 180 / Math.PI;
                var circle = geoCircle.center([item.longitude, item.latitude]).radius(radius);
                const [[x0, y0], [x1, y1]] = path.bounds(circle());
                d3.event.stopPropagation();
                svg.transition().duration(750).call(
                    zoom.transform,
                    d3.zoomIdentity
                        .translate(svg_rect.width / 2, svg_rect.height / 2)
                        .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / svg_rect.width, (y1 - y0) / svg_rect.height)))
                        .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
                    d3.mouse(svg.node())
                );

                update();
                update_hud();
            });

        $('[data-toggle="tooltip"]').tooltip();
    }

    var hdbs_extents, hdbs_scale, schs_extents, schs_scale;
    function inverse_interpolateBlues(t) {
        return d3.interpolateBlues(1 - t);
    }
    $.when(load_sg, load_hdbs, load_schs).then(function() {
        hdbs_extents = d3.extent(hdbs, function(item) {
            return item.resale_price;
        });
        hdbs_scale = d3.scaleSequential(hdbs_extents, d3.interpolateOranges);
        schs_extents = d3.extent(schs, function(item) {
            return item.vacancies;
        });
        schs_scale = d3.scaleSequential(schs_extents, inverse_interpolateBlues);
        update();
    });

    $(window).on('resize', update);

    $('#flattype').on('change', function(e) {
        var selection = $(this).val();
        if (selection === 'ALL') {
            settings.hdbs_flat_type = null;
        } else {
            settings.hdbs_flat_type = selection;
        }
        update();
        update_hud();
    });
    $('#radius').on('change', function(e) {
        settings.radius = $(this).val();
        $('#radius-text').text(settings.radius);
        update_hud();
    });

});
