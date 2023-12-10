# Bunny

![bunny logo](./bunny.jpeg)

Bunny is a toy [Lisp](https://en.wikipedia.org/wiki/Lisp_(programming_language)) implementation targeting 
[Bun](https://bun.sh). It is not performant, or robust, or featureful - but it has a little bytecode compiler and 
stack-based virtual machine, which I think is cute (like a bunny).

It's got an arbitrary mashup of [Clojure](https://clojure.org)-y identifiers (e.g. `def` and `defn`) with more "classic
Lisp/Scheme" syntax (e.g. `(let ((n 1) (m 2)) ...))` vs Clojure's `(let [n 1 m 2] ...)`).

## Try it

Disclaimer: The devx is bad - can't recommend it.

1. Install `bun`
2. Run `bun install` to install bunny's dependencies
3. Run `bun bunny` to get a REPL. Be warned, most line editing niceties (like arrow keys) don't work (see disclaimer)
4. By default, the environment only has bunny's "intrinsics" (functions implemented in TypeScript). To get the rest
   of the standard library (which includes such luxuries as `and`) evaluate `(load "prelude.bunny")`
5. `Control-c` to exit when you're done

If you've got an Emacs around, the best experience is likely to edit bunny source code in
[`clojure-mode`](https://github.com/clojure-emacs/clojure-mode) and use Emacs's "external (a.k.a. inferior) Lisp"
[support](https://www.gnu.org/software/emacs/manual/html_node/emacs/External-Lisp.html) to drive the REPL (which gets
you nice line editing for free).
