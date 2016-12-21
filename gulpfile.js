var gulp = require("gulp");
var ts = require("gulp-typescript");
var merge = require("merge-stream");
var tsProject = ts.createProject("tsconfig.json", { declaration: true });
var watch = require("gulp-watch");

gulp.task("compile", function () {
    var tsResults = tsProject.src()
        .pipe(tsProject());
    return merge([
         tsResults.js.pipe(gulp.dest("dist")),
         tsResults.dts.pipe(gulp.dest("dist"))
    ]); 
});

gulp.task("default", ['compile'], function() {
    gulp.watch('src/**/*.ts', ['compile']);
})