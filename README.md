Bucket.js
========

Bucket is a cross-browser client-side database solution. Bucket currently supports IndexedDB, WebSQL, and LocalStorage.
Bucket was developed by Chegg ME team, and is used heavily in Chegg's eReader.

Creating a bucket instance is dead-simple -

```js
var storage = new Bucket({
    driver_options : {
        table : 'foo'
    },
    drivers : ['IndexedDB'],
    onLoad : function(){},
    onError :function(){}
});
```

For an extended parameter list, see docs.

By default, bucket chooses the 1st usable driver in it's list (if no driver list was provided to the constructor). This means
that the easiest way to set application-wide driver prioritization is simply to control the order in which drivers are defined.
However, you can also specify which drivers you want the instance to use (and in which order) by specifying a driver list in
the parameters.

## Methods

All methods are async, and always receive a callback as the last parameter.
Bucket follows the Node.js pattern, where the 1st parameter of a callback is an error object (or `null` in case no error was generated).

### Bucket.set

```js
//singular
storage.set('a','b');

//plural
storage.set({
    'arieh' : 'glazer',
    'roded' : 'conforty'
});
```

### Bucket.get

```js
//singular
storage.get('a', function(err,value){
    console.log(value);
});

//plural
storage.get(['arieh','roded'], function(err,values){
    console.log(values); //{arieh:'glazer', roded:'conforty'}
});
```
### Bucket.remove

```js
//singular
storage.remove('a');

//plural
storage.remove(['a','arieh']);
```

### Bucket.exists

```js
storage.exists('arieh', function(err, ex){
    console.log(ex);
});
```

### Bucket.each

```js
storage.each(function(err, key, value){
    console.log(key, value);
});
```

### Bucket.getAll

```js
storage.getAll(function(err,map){
    //key value map
});
```

### Bucket.getKeys

```js
storage.getKeys(function(err, keys){
    //array of keys
});
```

### Bucket.getLength

```js
storage.getLength(function(err, len){});
```

### Bucket.clear
```js
storage.clear();
```