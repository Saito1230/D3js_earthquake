import * as d3 from 'd3';
const fs = await import("fs");
const { JSDOM } = await import("jsdom");
const { mysql } = await import("mysql2/promise");





//geosjon
const json = JSON.parse(fs.readFileSync("./prefectures.json", "utf-8"));
//config
const config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
//data
const data = JSON.parse(fs.readFileSync("./data2.json", "utf-8"));
//parameter
const parameters = JSON.parse(fs.readFileSync("./Parameter.json", "utf-8"));

const intensities = ["1", "2", "3", "4", "5-", "5+", "6-"," 6+", "7"];

//全角から半角へ変換します。
const fullSizeToHalfSize = (str) => {
    return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
}

let hyepicenter = data.body.earthquake.hypocenter;
let cities = data.body.intensity.cities;
let epicenter = [parseFloat(hyepicenter.coordinate.latitude.value), parseFloat(hyepicenter.coordinate.longitude.value)];




let m = data["body"]["earthquake"]["magnitude"]["value"];
let epicenter_text = data["body"]["earthquake"]["hypocenter"]["name"]
let headline = fullSizeToHalfSize(data["headline"]).replaceAll("　", "");
headline = headline.substring(0, headline.indexOf("、")) + "発生";
const document = new JSDOM("").window.document;




//初期化のために2つの配列を初期化
let lon = [epicenter[1], epicenter[1]];
let lat = [epicenter[0], epicenter[0]];
let volume = 1;
let sum_lon = epicenter[1];
let sum_lat = epicenter[0];

let DataList = [];
for(let key of cities) {
    for (let parameter of parameters.items) {
        if (parameter.city.code == key.code) {

            sum_lon += parseFloat(parameter.longitude);
            sum_lat += parseFloat(parameter.latitude);
            volume++;


            lon = [Math.max(lon[0], parseFloat(parameter.longitude)), Math.min(lon[1], parseFloat(parameter.longitude))];
            lat = [Math.max(lat[0], parseFloat(parameter.latitude)), Math.min(lat[1], parseFloat(parameter.latitude))];



            DataList.push(
                {
                    "name": key.name,
                    "location" : [parseFloat(parameter.longitude), parseFloat(parameter.latitude)],
                    "maxInt": key.maxInt
                }
            )

            continue;
        }
    }
}

let center = [sum_lon / volume, sum_lat / volume];
let rate = lon[0] - lon[1] + lat[0] - lat[1];
let _scale;

if(rate == 0) _scale = 1;
else if(rate < 1) _scale = 3;
else if(rate < 3) _scale = 1.75;
else if(rate < 5) _scale = 1.4;
else if(rate < 7) _scale = 1.2;
else if(rate < 9) _scale = 1.2;
else _scale = 0.5;

//image size
let width = 1280,
    height = 720;

//map init
const projection = d3
    .geoMercator()
    .center(center)
    .translate([width / 2, height / 2])
    .scale(10000 * _scale);

// draw path
const path = d3.geoPath().projection(projection);

main()

async function main() {


    //generate svg
    var svg = d3.select(document.body)
        .append('svg')
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr('width', width)
        .attr('height', height)
        .attr('xmin', projection.invert([0, 0])[0])
        .attr('xmax', projection.invert([width, height])[0])
        .attr('ymin', projection.invert([width, height])[1])
        .attr('ymax', projection.invert([0, 0])[1])
        .attr('scale', projection.scale())
        .attr('encoding', 'utf-8')
        .attr('font-family', "Koruri")

        //backgroundColor
        svg.append("rect")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("fill", config.SeaColor);

        //Draw MAP
        svg.append('path')
            .datum(json)
            .attr('stroke-width', 0.5)
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .style('fill', config.PrefColor)
            .style('stroke', "#FFFFFF")
            .attr('d', path)

        const Export = (area, color, text) => {
            let coordinate = projection(area);
            svg.append("circle")
                .attr("r", 10)
                .attr("cx", coordinate[0])
                .attr("cy", coordinate[1])
                .style("fill", color)

            svg.append("text")
                .text(text)
                .attr("x", coordinate[0] + 2)
                .attr("y", coordinate[1] + 5)
                .attr('font-size', 15)
                .attr('text-anchor', 'middle')


        }

        //震度が大きい順に手前に表示
        DataList.reverse();

        //震度チップ描画
        for(let data of DataList){
            intensities.forEach((intensity) => {
                if(data.maxInt === intensity){
                    let color = config[intensity].backColor;
                    //let text = config[intensity].Text;
                    let text = "";
                    Export(data.location, color, text);
                }
            })
        }

        //information background
        svg.append("rect")
            .attr("width", "45%")
            .attr("height", "20%")
            .attr("fill", "#000000")
            .attr("fill-opacity", 0.6)

        svg.append("rect")
            .attr("width", "20%")
            .attr("height", "10%")
            .attr("fill",config[data.body.intensity.maxInt].backColor)


        svg.append("text")
            .text("最大震度")
            .attr("x", 10)
            .attr("y", 60)
            .attr('font-size', 30)

            .attr("fill", config[data.body.intensity.maxInt].foreColor)


        if(data.body.intensity.maxInt === "5-" || data.body.intensity.maxInt === "5+" ||
            data.body.intensity.maxInt === "6-" || data.body.intensity.maxInt === "6+" ){

            svg.append("text")
                .text(data.body.intensity.maxInt.substring(0, 1))
                .attr("x", 140)
                .attr("y", 65)
                .attr('font-size', 70)
                .attr('font-family', "Roboto")
                .attr('font-style', "italic")
                .attr("fill", "#FFFFFF")

            svg.append("text")
                .text((data.body.intensity.maxInt.substring(0, 1) === "-") ? "弱" : "強")
                .attr("x", 190)
                .attr("y", 60)
                .attr('font-size', 45)
                .attr('font-family', "Roboto")
                .attr('font-style', "italic")
                .attr("fill", "#FFFFFF")
        }else{
            svg.append("text")
                .text(data.body.intensity.maxInt)
                .attr("x", 160)
                .attr("y", 65)
                .attr('font-size', 70)
                .attr('font-family', "Roboto")
                .attr('font-style', "italic")
                .attr("fill", "#000000")
        }



        svg.append("text")
            .text("震源地")
            .attr("x", 260)
            .attr("y", 20)
            .attr('font-size', 20)

            .attr("fill", "#FFFFFF")

        svg.append("text")
            .text(epicenter_text)
            .attr("x", 290)
            .attr("y", 50)
            .attr('font-size', 25)

            .attr("fill", "#FFFFFF")

        svg.append("text")
            .text(headline)
            .attr("x", 10)
            .attr("y", 90)
            .attr('font-size', 15)

            .attr("fill", "#FFFFFF")


        let depth = data["body"]["earthquake"]["hypocenter"]["depth"]["value"];
        let depth_unit = data["body"]["earthquake"]["hypocenter"]["depth"]["unit"];
        //ごく深い, 700km以上, 深さ不明に対応させる
        if (data["body"]["earthquake"]["hypocenter"]["depth"].hasOwnProperty("condition")) {
            let str = data["body"]["earthquake"]["hypocenter"]["depth"]["condition"];
            depth = (str.includes("不明")) ? "不明" : str;
            depth_unit = "";
        }

        svg.append("text")
            .text("深さ")
            .attr("x", 270)
            .attr("y", 90)
            .attr('font-size', 20)

            .attr("fill", "#FFFFFF")

        svg.append("text")
            .text(depth + depth_unit)
            .attr("x", 320)
            .attr("y", 90)
            .attr('font-size', 25)

            .attr("fill", "#FFFFFF")

        svg.append("text")
            .text("規模")
            .attr("x", 430)
            .attr("y", 90)
            .attr('font-size', 20)
            .attr("fill", "#FFFFFF")

        svg.append("text")
            .text(`M ${m}`)
            .attr("x", 480)
            .attr("y", 90)
            .attr('font-size', 25)
            .attr("fill", "#FFFFFF")


        let tsunami_text = "-";
        let tsunami_color = "#FFFF00"
        let tsunami_locationX = 170
        let fontSize = 20;
        let comment_codes = data["body"]["comments"]["forecast"]["codes"];
        if(comment_codes.indexOf("0215") > -1){tsunami_text = "津波の心配なし"; tsunami_color = "#FFFFFF"; tsunami_locationX=350; fontSize=30}
        else if(comment_codes.indexOf("0212") > -1){tsunami_text = "若干の海面変動 被害の心配なし"; tsunami_locationX = 200;fontSize=25}
        else if(comment_codes.indexOf("0211") > -1)tsunami_text = "津波に関する情報（津波警報等）を発表中"
        svg.append("text")
            .text(tsunami_text)
            .attr("x", tsunami_locationX)
            .attr("y", 130)
            .attr('font-size', fontSize)
            .attr("fill", tsunami_color)




    /*

            //svg to png or BASE64
            //let svgDataBase64 = btoa(unescape(encodeURI(document.body.innerHTML)));
            //tweetする場合はこれは使わない
            //const svgDataUrl = `data:image/svg+xml;charset=utf-8;base64,${svgDataBase64}`

            //fs.writeFile("base64.html", `<html><body><img src='${svgDataUrl}'></body></html>`, (err) => {
            //    if(err) console.log(err);
            //    console.log("SUCCESS");
            //});




     */
    //Export SVG
    fs.writeFile("output.svg", document.body.innerHTML, (err) => {
        if(err) console.log(err);
        console.log("SUCCESS");
    })
}

