/* ------------------
 * The top-level ScalaJS environment
 * ------------------ */

function $ScalaJSEnvironmentClass() {
  // Fields
  this.primitives = {};
  this.classes = {};
  this.modules = {};
  this.natives = {};

  // Core mechanism

  this.createType = function(name, typeFunction, parent, ancestors, isPrimitive,
                             isInterface, isArray, componentData, zero,
                             arrayEncodedName, displayName) {
    var data = {
      name: name,
      type: typeFunction,
      parent: parent,
      parentData: parent === null ? null : this.classes[parent],
      ancestors: ancestors,
      isPrimitive: isPrimitive,
      isInterface: isInterface,
      isArray: isArray,
      componentData: componentData,
      zero: zero,
      arrayEncodedName: arrayEncodedName,
      displayName: displayName,
      _class: undefined,
      get class() {
        if (this._class === undefined)
          this._class = $ScalaJSEnvironment.createClassInstance(this);
        return this._class;
      },
      _array: undefined,
      get array() {
        if (this._array === undefined)
          this._array = $ScalaJSEnvironment.createArrayClass(this);
        return this._array;
      }
    };

    if (typeFunction !== undefined)
      typeFunction.prototype.$classData = data;

    if (!isPrimitive && !isArray) {
      Object.defineProperty(this.classes, name, {
        __proto__: null,
        enumerable: true,
        configurable: false,
        writable: false,
        value: data
      });
    } else if (isPrimitive) {
      Object.defineProperty(this.primitives, name, {
        __proto__: null,
        enumerable: true,
        configurable: false,
        writable: false,
        value: data
      });
    }

    return data;
  }

  this.createClass = function(name, typeFunction, parent, ancestors) {
    return this.createType(name, typeFunction, parent, ancestors,
                           false, false, false, null, null, "L" + name + ";");
  };

  this.createPrimitiveType = function(name, zero, arrayEncodedName,
                                      displayName) {
    var ancestors = {};
    ancestors[name] = true;
    return this.createType(name, undefined, null, ancestors,
                           true, false, false, null, zero,
                           arrayEncodedName, displayName);
  };

  this.createArrayClass = function(componentData) {
    var name = componentData.name + "[]";
    var encodedName = "[" + componentData.arrayEncodedName;
    var typeFunction = this.createArrayTypeFunction(name, componentData);

    var compAncestors = componentData.ancestors;
    var ancestors = {"java.lang.Object": true};
    for (var compAncestor in compAncestors)
      ancestors[compAncestor+"[]"] = true;

    return this.createType(name, typeFunction, "java.lang.Object",
                           ancestors,
                           false, false, true, componentData, null,
                           encodedName, encodedName);
  };

  this.createInterface = function(name, ancestors) {
    return this.createType(name, undefined, null, ancestors,
                           false, true, false, null, null,
                           "L" + name + ";", name);
  };

  this.registerClass = function(name, createFunction) {
    var self = this;
    Object.defineProperty(this.classes, name, {
      __proto__: null,
      enumerable: true,
      configurable: true,
      get: function() {
        createFunction(self); // hopefully this calls createClass(name) ...
        return this[name];    // ... otherwise this will recurse infinitely
      }
    });
  }

  this.registerModule = function(name, className, constructorName) {
    var self = this;
    var data = {
      _instance: undefined,
      get instance() {
        if (this._instance === undefined)
          this._instance = new self.classes[className].type()[constructorName]();
        return this._instance
      }
    };
    this.modules[name] = data;
  }

  this.createClassInstance = function(data) {
    return new this.classes["java.lang.Class"].type()[
      "<init>(<special>):java.lang.Class"](data);
  }

  this.registerNative = function(fullName, nativeFunction) {
    this.natives[fullName] = nativeFunction;
  }

  // Create primitive types

  this.createPrimitiveType("scala.Unit", undefined, "V", "void");
  this.createPrimitiveType("scala.Boolean", false, "Z", "boolean");
  this.createPrimitiveType("scala.Char", 0, "C", "char");
  this.createPrimitiveType("scala.Byte", 0, "B", "byte");
  this.createPrimitiveType("scala.Short", 0, "S", "short");
  this.createPrimitiveType("scala.Int", 0, "I", "int");
  this.createPrimitiveType("scala.Long", 0, "J", "long");
  this.createPrimitiveType("scala.Float", 0.0, "F", "float");
  this.createPrimitiveType("scala.Double", 0.0, "D", "double");

  // Runtime functions

  // Defined in javalangString.js
  // this.makeNativeStrWrapper = function(nativeStr) {...};

  // Defined in javalangArray.js
  // this.createArrayTypeFunction = function(name, componentData) {...};

  this.isInstance = function(instance, classFullName) {
    if ((typeof(instance) !== "object") || (instance === null))
      return false;
    else {
      var classData = instance.$classData;
      if (classData === undefined)
        return false;
      else
        return classData.ancestors[classFullName] ? true : false;
    }
  };

  this.asInstance = function(instance, classFullName) {
    if ((instance === null) || this.isInstance(instance, classFullName))
      return instance;
    else
      throw new this.classes["java.lang.ClassCastException"].type()[
        "<init>(java.lang.String):java.lang.ClassCastException"](
          this.makeNativeStrWrapper(
            instance + " is not an instance of " + classFullName));
  };

  this.makeNativeArrayWrapper = function(arrayClassData, nativeArray) {
    return new arrayClassData.type(nativeArray);
  };

  this.newArrayObject = function(arrayClassData, lengths) {
    return this.newArrayObjectInternal(arrayClassData, lengths, 0);
  };

  this.newArrayObjectInternal = function(arrayClassData, lengths, lengthIndex) {
    var result = new arrayClassData.type(lengths[lengthIndex]);

    if (lengthIndex < lengths.length-1) {
      var subArrayClassData = arrayClassData.componentData;
      var subLengthIndex = lengthIndex+1;
      for (var i = 0; i < result.length(); i++) {
        result.set(i, this.newArrayObjectInternal(
          subArrayClassData, lengths, subLengthIndex));
      }
    }

    return result;
  };

  this.anyEqEq = function(lhs, rhs) {
    return this.modules["scala.runtime.BoxesRunTime$"].instance[
      "equals(java.lang.Object,java.lang.Object):scala.Boolean"](lhs, rhs);
  }

  this.anyRefEqEq = function(lhs, rhs) {
    if (lhs === null)
      return rhs === null;
    else
      return lhs["equals(java.lang.Object):scala.Boolean"](rhs);
  }
}

var $ScalaJSEnvironment = new $ScalaJSEnvironmentClass();