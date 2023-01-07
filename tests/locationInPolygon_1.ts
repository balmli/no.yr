import {expect} from 'chai';
import {isPointInPolygon, transformToPolygon} from "../lib/yr_lib";

const polygon = '60.874500,4.447833 60.793833,4.493000 60.720000,4.534167 60.707333,4.541167 60.620667,4.589167 60.556667,4.623167 60.469833,4.669167 60.463667,4.672500 60.383000,4.714833 60.296167,4.760333 60.246667,4.786000 60.243667,4.787167 60.178333,4.811500 60.124500,4.831500 60.090167,4.844167 60.001833,4.876833 59.971667,4.882667 59.941833,4.888333 59.929000,4.890833 59.882333,4.899833 59.866333,4.903000 59.793000,4.917000 59.738167,4.927667 59.648833,4.945000 59.582500,4.901000 59.497333,4.844833 59.482833,4.835333 59.500000,4.967000 59.513000,5.134667 59.523667,5.181667 59.511667,5.208667 59.477167,5.309000 59.491500,5.368000 59.491333,5.407500 59.502333,5.471833 59.515500,5.466333 59.517333,5.491333 59.520500,5.511500 59.527333,5.521667 59.535667,5.522333 59.544500,5.541667 59.556000,5.546333 59.572333,5.553500 59.589500,5.544667 59.613000,5.542000 59.638500,5.538667 59.661167,5.553667 59.684667,5.562667 59.707833,5.569667 59.747500,5.574333 59.742500,5.590667 59.735333,5.605333 59.722833,5.620167 59.712333,5.621667 59.702333,5.635667 59.688333,5.671833 59.690833,5.702167 59.693167,5.735500 59.691000,5.755833 59.645000,5.793667 59.648000,5.824500 59.635667,5.830000 59.627500,5.855500 59.624000,5.889667 59.603167,5.906667 59.610833,5.926000 59.599667,5.968333 59.582333,5.971500 59.586500,6.011000 59.593667,6.015167 59.595000,6.049833 59.600333,6.073333 59.590333,6.111667 59.591833,6.187833 59.623500,6.175833 59.640167,6.182167 59.643333,6.201000 59.692167,6.229167 59.704833,6.270500 59.732833,6.268500 59.766833,6.304333 59.771500,6.330500 59.783167,6.334000 59.787167,6.418333 59.809500,6.443833 59.844167,6.533500 59.832500,6.590167 59.840333,6.670667 59.820833,6.690000 59.796167,6.672833 59.767167,6.683667 59.715000,6.645000 59.697500,6.697500 59.703667,6.763833 59.730167,6.839167 59.741667,6.881500 59.774000,6.998000 59.782667,7.093333 59.810833,7.142167 59.831667,7.158833 59.846167,7.144500 59.886167,7.151167 59.931833,7.188833 59.963833,7.228000 59.987667,7.280167 59.990667,7.329833 60.002000,7.370333 60.019333,7.436667 60.057333,7.437667 60.100167,7.492167 60.177333,7.581167 60.247500,7.610500 60.293333,7.672833 60.413000,7.684000 60.529000,7.710833 60.543333,7.661833 60.564167,7.629667 60.594167,7.617167 60.633833,7.633833 60.660500,7.546833 60.673833,7.462833 60.745833,7.621000 60.732000,7.688667 60.760667,7.725167 60.788000,7.719000 60.793333,7.704333 60.844167,7.753333 60.871000,7.782333 60.896000,7.804667 60.919500,7.849333 60.924000,7.881000 60.899000,7.937500 60.896333,8.013000 60.899167,8.044333 60.982000,8.151500 60.969667,8.184500 60.968000,8.223333 60.993667,8.231333 61.000500,8.221167 61.009000,8.234667 61.009500,8.261667 61.032000,8.280167 61.057333,8.220500 61.076167,8.252167 61.100333,8.178000 61.109667,8.137000 61.178667,8.069333 61.174167,8.047333 61.181500,8.043333 61.193833,8.057833 61.220500,8.051333 61.223667,8.025833 61.229000,8.008500 61.234833,8.005333 61.234167,8.051500 61.247833,8.067667 61.267500,8.135833 61.279500,8.141333 61.303333,8.177667 61.304167,8.211000 61.318000,8.232500 61.332167,8.246333 61.336167,8.247000 61.346333,8.220167 61.354833,8.214833 61.353333,8.199333 61.361000,8.167667 61.379333,8.155000 61.425500,8.150833 61.437333,8.190667 61.428333,8.215500 61.431833,8.277333 61.446333,8.303333 61.455667,8.321667 61.480000,8.303167 61.487333,8.287500 61.514000,8.273667 61.533667,8.260500 61.546833,8.193167 61.523167,8.117833 61.539333,8.012500 61.555667,7.945000 61.600167,7.934167 61.648500,7.891000 61.679000,7.906667 61.725167,7.909333 61.743500,7.829000 61.754000,7.754167 61.741167,7.683167 61.738333,7.598167 61.729000,7.513833 61.762000,7.512500 61.787000,7.481667 61.812500,7.459833 61.857167,7.415000 61.898167,7.408833 61.934000,7.389167 62.001000,7.390000 62.008000,7.352000 62.017500,7.311333 62.019000,7.245833 62.034833,7.235833 62.029667,7.199667 62.017667,7.201833 62.011500,7.169167 62.007667,7.071167 61.984167,7.058833 61.984333,7.020333 61.983167,6.980500 61.986833,6.952000 61.978833,6.891833 61.963500,6.839167 61.965000,6.795333 61.980167,6.788167 61.996667,6.764667 62.002833,6.748667 62.045833,6.694667 62.062000,6.685500 62.070667,6.659167 62.064333,6.636000 62.051333,6.621500 62.052500,6.603000 62.059333,6.575167 62.053833,6.559500 62.055000,6.535167 62.041500,6.528500 62.037667,6.495167 62.021500,6.500667 62.015667,6.495500 62.017167,6.469333 62.011667,6.460333 62.014333,6.422333 62.005667,6.399000 61.987167,6.405333 61.962833,6.350000 61.961167,6.317000 61.975500,6.281333 61.991000,6.234833 62.006167,6.255333 62.009833,6.179667 61.991167,6.169833 61.986167,6.132167 61.971667,6.138167 61.961667,6.092500 61.967167,6.063333 61.957500,6.037333 61.973167,6.007833 61.990167,5.966500 61.994500,5.923167 61.987333,5.890333 61.977833,5.863000 61.964667,5.800167 61.980667,5.736667 61.982000,5.730500 61.967667,5.699167 61.974833,5.677000 61.966167,5.604667 61.961333,5.558667 61.964833,5.539333 61.971000,5.530500 61.978000,5.502167 61.983667,5.479167 61.976167,5.464000 61.975167,5.442167 61.991333,5.458500 62.010167,5.503667 62.014500,5.486833 62.031833,5.494000 62.064333,5.509000 62.105667,5.399000 62.123000,5.362000 62.149000,5.357500 62.170833,5.355333 62.257667,5.231667 62.275833,5.173000 62.308833,5.060167 62.297667,5.044500 62.222167,4.940333 62.222000,4.940000 62.218167,4.935167 62.214167,4.930833 62.164833,4.882000 62.137167,4.854833 62.055667,4.774667 62.053833,4.773000 62.046333,4.766333 61.995833,4.720667 61.963833,4.691667 61.963333,4.691333 61.925333,4.657667 61.842333,4.585000 61.759500,4.512667 61.718667,4.477167 61.676500,4.440667 61.676333,4.440500 61.672000,4.437167 61.667833,4.434667 61.663333,4.432500 61.659000,4.431167 61.654500,4.430333 61.614333,4.426167 61.524667,4.416833 61.517667,4.416167 61.435000,4.407667 61.345333,4.398500 61.255667,4.389333 61.227833,4.386500 61.166167,4.380333 61.076500,4.371333 61.038500,4.366500 61.034333,4.366333 61.027667,4.366333 61.023500,4.366667 61.019000,4.367500 61.014500,4.369000 61.010167,4.371167 60.967000,4.395667 60.880500,4.444500 60.874500,4.447833';
const allPoints = transformToPolygon(polygon);

describe('isPointInPolygon', function () {
    describe('Check isPointInPolygon', function () {
        it('Bergen', function () {
            expect(isPointInPolygon(60.393608, 5.316064, allPoints)).eq(true);
        });
        it('Bekkjarvik', function () {
            expect(isPointInPolygon(60.008436, 5.194123, allPoints)).eq(true);
        });
        it('Rosendal', function () {
            expect(isPointInPolygon(60.000098, 6.005009, allPoints)).eq(true);
        });
        it('Skånevik', function () {
            expect(isPointInPolygon(59.727937, 5.884714, allPoints)).eq(true);
        });
        it('Karmøy', function () {
            expect(isPointInPolygon(59.398615, 5.243378, allPoints)).eq(false);
        });
        it('Geilo', function () {
            expect(isPointInPolygon(60.531042, 8.204562, allPoints)).eq(false);
        });
    });
});
