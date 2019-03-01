Store untyped lambda calculus expressions in a SQLite database.

```
> npm start def I "\x.x"
I = (\p$0. p$0)
> npm start def K "\x y.x"
K = (\p$1. (\p$0. p$1))
> npm start def S "\x y z.x z (y z)"
S = (\p$2. (\p$1. (\p$0. ((p$2 p$0) (p$1 p$0)))))
> npm start eval "S K K"
(\p$0. p$0)
```

TODO
- pretty print expressions (improve name generation)
- REPL interface
- slack bot interface
