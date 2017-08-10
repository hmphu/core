'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
    defaultAssets = require('./config/assets/default'),
    testAssets = require('./config/assets/test'),
    gulp = require('gulp'),
    gulpLoadPlugins = require('gulp-load-plugins'),
    runSequence = require('run-sequence'),
    plugins = gulpLoadPlugins(),
    path = require('path');

// Set NODE_ENV to 'test'
gulp.task('env:test', function () {
    process.env.NODE_ENV = 'test';
});

// Set NODE_ENV to 'development'
gulp.task('env:dev', function () {
    process.env.NODE_ENV = 'development';
});

// Set NODE_ENV to 'production'
gulp.task('env:prod', function () {
    process.env.NODE_ENV = 'production';
});

// Nodemon task
gulp.task('nodemon', function () {
    return plugins.nodemon({
        script: 'server.js',
        //nodeArgs: ['--debug'],
        ext: 'js',
        watch: _.union(defaultAssets.server.allJS, defaultAssets.server.config)
    });
});

// Watch Files For Changes
gulp.task('watch', function () {
    plugins.livereload.listen();

    // Add watch rules
    gulp.watch(defaultAssets.server.allJS).on('change', plugins.livereload.changed);
    gulp.watch(defaultAssets.server.gulpConfig);
});

// Mocha tests task
gulp.task('mocha', function (done) {
    // Open mongoose connections
    var mongoose = require('./config/lib/mongoose.js');
    var error;

    // Connect mongoose
    mongoose.connect(function () {
        mongoose.loadModels();
        // Run the tests
        gulp.src(testAssets.tests.server)
            .pipe(plugins.mocha({
                reporter: 'spec',
                timeout: 10000
            }))
            .on('error', function (err) {
                // If an error occurs, save it
                error = err;
            })
            .on('end', function () {
                // When the tests are done, disconnect mongoose and pass the error state back to gulp
                mongoose.disconnect(function () {
                    done(error);
                });
            });
    });

});

// Lint project files and minify them into two production files.
gulp.task('build', function (done) {
    runSequence('env:dev', done);
});

// Run the project tests
gulp.task('test', function (done) {
    runSequence('env:test', 'mocha', 'karma', 'nodemon', 'protractor', done);
});

gulp.task('test:server', function (done) {
    runSequence('env:test', 'mocha', done);
});

// Run the project in development mode
gulp.task('default', function (done) {
    runSequence('env:dev', ['nodemon', 'watch'], done);
});

// Run the project in debug mode
gulp.task('debug', function (done) {
    runSequence('env:dev', ['nodemon', 'watch'], done);
});

// Run the project in production mode
gulp.task('prod', function (done) {
    runSequence('build', 'env:prod', ['nodemon', 'watch'], done);
});