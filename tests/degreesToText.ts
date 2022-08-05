import {expect} from 'chai';

import {degreesToText} from '../lib/yr_lib';

describe('degreesToText', function () {

    describe('Check degreesToText', function () {
        it('Check north', function () {
            expect(degreesToText(-11)).eq('N');
            expect(degreesToText(0)).eq('N');
            expect(degreesToText(11)).eq('N');
            expect(degreesToText(360)).eq('N');
            expect(degreesToText(720)).eq('N');
            expect(degreesToText(-360)).eq('N');
            expect(degreesToText(-361)).eq('N');
            expect(degreesToText(-359)).eq('N');
        });
        it('Check NNE', function () {
            expect(degreesToText(23)).eq('NNE');
        });
        it('Check NE', function () {
            expect(degreesToText(45)).eq('NE');
        });
        it('Check ENE', function () {
            expect(degreesToText(67)).eq('ENE');
        });
        it('Check east', function () {
            expect(degreesToText(79)).eq('E');
            expect(degreesToText(90)).eq('E');
            expect(degreesToText(101)).eq('E');
        });
        it('Check south', function () {
            expect(degreesToText(169)).eq('S');
            expect(degreesToText(180)).eq('S');
            expect(degreesToText(191)).eq('S');
        });
        it('Check wesyt', function () {
            expect(degreesToText(259)).eq('W');
            expect(degreesToText(270)).eq('W');
            expect(degreesToText(281)).eq('W');
        });

    });

});
