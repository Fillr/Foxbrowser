//version:1.2.15
(function() {
'use strict';

// ==============================================
// = Tweaked 'common.js' for Pop! mobile widget =
// ==============================================

var modules = {};
var cache = {};
var globals = {};
var has = function(object, name) {
  return ({}).hasOwnProperty.call(object, name);
};

var expand = function(root, name) {
  var results = [], parts, part;
  if (/^\.\.?(\/|$)/.test(name)) {
    parts = [root, name].join('/').split('/');
  } else {
    parts = name.split('/');
  }
  for (var i = 0, length = parts.length; i < length; i++) {
    part = parts[i];
    if (part === '..') {
      results.pop();
    } else if (part !== '.' && part !== '') {
      results.push(part);
    }
  }
  return results.join('/');
};

var dirname = function(path) {
  return path.split('/').slice(0, -1).join('/');
};

var localRequire = function(path) {
  return function(name) {
    var dir = dirname(path);
    var absolute = expand(dir, name);
    return globals.require(absolute, path);
  };
};

var initModule = function(name, definition) {
  var module = {id: name, exports: {}};
  cache[name] = module;
  definition(module.exports, localRequire(name), module);
  return module.exports;
};

var require = function(name, loaderPath) {
  var path = expand(name, '.');
  if (loaderPath == null) loaderPath = '/';

  if (has(cache, path)) return cache[path].exports;
  if (has(modules, path)) return initModule(path, modules[path]);

  var dirIndex = expand(path, './index');
  if (has(cache, dirIndex)) return cache[dirIndex].exports;
  if (has(modules, dirIndex)) return initModule(dirIndex, modules[dirIndex]);

  throw new Error('Cannot find module "' + name + '" from '+ '"' + loaderPath + '"');
};

var define = function(bundle, fn) {
  if (typeof bundle === 'object') {
    for (var key in bundle) {
      if (has(bundle, key)) {
        modules[key] = bundle[key];
      }
    }
  } else {
    modules[bundle] = fn;
  }
};

var list = function() {
  var result = [];
  for (var item in modules) {
    if (has(modules, item)) {
      result.push(item);
    }
  }
  return result;
};

globals.require = require;
globals.require.define = define;
globals.require.register = define;
globals.require.list = list;
globals.require.brunch = true;

// =========================
// = end tweaked common.js =
// =========================

require.register("widget/config/environment", function(exports, require, module) {
module.exports = {
  css: '/mobile-widget.css',
  mappings: {
    countries: function() {
      return '//popanyform.s3.amazonaws.com/extension/countries.json';
    }
  }
};

});

require.register("widget/config/preferences", function(exports, require, module) {
var Environment, _ref;

Environment = require('widget/config/environment');

module.exports = {
  browserType: typeof window !== "undefined" && window !== null ? (_ref = window.navigator) != null ? _ref.product : void 0 : void 0,
  name: 'Fillr widget',
  mappings: {
    countries: function() {
      return Environment.mappings.countries();
    }
  },
  css: {
    url: Environment.css
  },
  page: {
    cssPrefix: 'pop-widget',
    animate: {
      pop: {
        timeTotal: 2000,
        timeMin: 50,
        timeUntilFade: 2000
      },
      delayBeforeScroll: 3000,
      scrollSpeed: 800
    }
  }
};

});

require.register("widget/controller", function(exports, require, module) {
var Fields, Mappings, Pop, PublisherApi;

Mappings = require('widget/pop/mappings');

Fields = require('widget/fields');

Pop = require('widget/pop');

PublisherApi = require('widget/pop/publisher_api');

module.exports = {
  getFields: function() {
    return Mappings.payload(Fields.detect(document));
  },
  getPublisherFields: function() {
    return PublisherApi.fields();
  },
  populateWithMappings: function(mappedFields, popData) {
    return Pop.create({
      mappedFields: mappedFields,
      popData: popData
    });
  },
  publisherPopulate: function(popData) {
    return PublisherApi.populate(popData);
  },
  require: function(args) {
    return require(args);
  }
};

});

require.register("widget/domain", function(exports, require, module) {
var Domains;

module.exports = Domains = {
  base: function() {
    return this.full().replace('www.', '');
  },
  full: function() {
    return window.location.hostname;
  },
  origin: function() {
    return window.location.origin;
  },
  fullPath: function() {
    var out;
    out = window.location.pathname;
    if (window.location.search) {
      out += window.location.search;
    }
    if (window.location.hash) {
      out += window.location.hash;
    }
    return out;
  },
  referrer: function() {
    return window.document.referrer;
  },
  location: function() {
    return {
      domain: this.full(),
      origin: this.origin(),
      path: this.fullPath(),
      referrer: this.referrer()
    };
  }
};

});

require.register("widget/fields", function(exports, require, module) {
var FormInput, IsVisible, jQuery;

FormInput = require('widget/fields/input');

IsVisible = require('widget/lib/isvisible');

jQuery = require('widget/lib/jquery');

module.exports = {
  fields: void 0,
  groups: {},
  sectionHints: {},
  nextGroup: 0,
  detect: function() {
    return this.fields = this._detect(document);
  },
  _detect: function(searchRoot) {
    var field, fields, group, newField;
    fields = (function() {
      var _i, _len, _ref, _results;
      _ref = this._allFields();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        field = _ref[_i];
        newField = new FormInput(field);
        if (newField.ignore()) {
          continue;
        } else {
          group = this._findGroup(field);
          newField.metadata.section_hint = this.sectionHints[group];
          _results.push(newField);
        }
      }
      return _results;
    }).call(this);
    if (fields.length === 0) {
      return new Error('No popable fields on the page');
    } else {
      return fields;
    }
  },
  _findGroup: function(el) {
    var e, initial, key, nextEl, result, totalFieldsCount, val, _i, _len, _ref;
    _ref = this.groups;
    for (key in _ref) {
      val = _ref[key];
      for (_i = 0, _len = val.length; _i < _len; _i++) {
        e = val[_i];
        if (el === e) {
          return key;
        }
      }
    }
    this.nextGroup++;
    if (document.getElementById('specinator-ui')) {
      totalFieldsCount = document.querySelectorAll('select,input').length - document.getElementById('specinator-ui').querySelectorAll('select,input').length;
    } else {
      totalFieldsCount = document.querySelectorAll('select,input').length;
    }
    nextEl = el.parentElement;
    initial = el.parentElement.querySelectorAll('select,input');
    result = initial;
    if (result.length === 1) {
      while (nextEl = nextEl.parentElement) {
        if (nextEl.parentElement.tagName.toLowerCase() === 'body') {
          break;
        }
        result = nextEl.querySelectorAll('select,input');
        if (result.length >= totalFieldsCount) {
          result = initial;
          break;
        }
        if (result.length > initial.length) {
          break;
        }
      }
    }
    this.groups[this.nextGroup] = Array.prototype.slice.call(result);
    this.sectionHints[this.nextGroup] = this._sectionHint(el);
    return this.nextGroup;
  },
  _allFields: function() {
    var div, doc, e, element, elements, field, fieldset, form, i, selectors, things, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2;
    selectors = ['input:not([type=button]):not([type=submit]):not([type=reset]):not([type=password]):not([type=radio]):not([type=checkbox]):not([type=image])', 'select', 'textarea'].join(', ');
    things = [];
    elements = document.querySelectorAll(selectors);
    for (_i = 0, _len = elements.length; _i < _len; _i++) {
      element = elements[_i];
      things.push(element);
    }
    try {
      _ref = document.getElementsByTagName('iframe');
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        doc = _ref[_j];
        if (!this._sameOrigin(doc.src)) {
          continue;
        }
        if ((doc != null ? (_ref1 = doc.contentWindow) != null ? (_ref2 = _ref1.Element) != null ? _ref2.prototype : void 0 : void 0 : void 0) != null) {
          doc.contentWindow.Element.prototype.isVisible = window.Element.prototype.isVisible;
          elements = doc.contentDocument.querySelectorAll(selectors);
          for (_k = 0, _len2 = elements.length; _k < _len2; _k++) {
            element = elements[_k];
            things.push(element);
          }
        }
      }
    } catch (_error) {
      e = _error;
      console.log(e);
    }
    i = things.length;
    while (i--) {
      field = things[i];
      form = this._closest(field, 'form');
      if (form && !form.isVisible()) {
        things.splice(i, 1);
        continue;
      }
      fieldset = this._closest(field, 'fieldset');
      if (fieldset && !fieldset.isVisible()) {
        things.splice(i, 1);
        continue;
      }
      div = this._closest(field, 'div');
      if (div && !div.isVisible()) {
        things.splice(i, 1);
        continue;
      }
      if (field.classList && field.classList.contains('pop-filled')) {
        if (field.type === 'select-one' && field.selectedIndex !== 0) {
          things.splice(i, 1);
          continue;
        } else if (field.value !== '') {
          things.splice(i, 1);
          continue;
        }
      }
      if (field.type === 'select-one' && !field.isVisible() && field.options.length < 2) {
        things.splice(i, 1);
        continue;
      }
      if (field.clientWidth === 0 && field.clientHeight === 0 && (field.tagName === 'INPUT' || field.tagName === 'SELECT')) {
        things.splice(i, 1);
        continue;
      }
    }
    return things;
  },
  _closest: function(elem, selector) {
    while (elem) {
      if (elem.matches && elem.matches(selector)) {
        return elem;
      } else {
        elem = elem.parentNode;
      }
    }
    return null;
  },
  _sameOrigin: function(url) {
    var a, loc;
    loc = window.location;
    a = document.createElement('a');
    a.href = url;
    if (['https:', 'http:'].indexOf(a.protocol) === -1) {
      return true;
    }
    return a.hostname === loc.hostname && a.port === loc.port && a.protocol === loc.protocol;
  },
  _sectionHint: function(el) {
    var $dom, best, dom, error, hint, hints, lineRgx, p, search, sel, specialCharacterRgx, splitterToken, text, txt, winner, _i, _len;
    hints = ['bill', 'ship', 'postal', 'delivery', 'residential', 'payment'];
    specialCharacterRgx = /([ #;&,.+*~\':"!^$[\]()=>|\/])/g;
    lineRgx = /\s{2,}/gi;
    splitterToken = 'FILLRSECTIONSPLIT';
    p = el.parentElement;
    while (p.tagName.toLowerCase() !== 'body') {
      try {
        dom = p.cloneNode(true);
        $dom = jQuery(dom);
        if (!!el.id) {
          sel = el.id.replace(specialCharacterRgx, '\\$1');
          $dom.find("#" + sel).replaceWith(splitterToken);
        } else if (!!el.name) {
          sel = el.name.replace(specialCharacterRgx, '\\$1');
          $dom.find("[name=" + sel + "]").replaceWith(splitterToken);
        } else {
          $dom.find('input,select').filter(function(i, e) {
            return e.isEqualNode(el);
          }).replaceWith(splitterToken);
        }
        $dom.find('select,option,script,input,style').each(function(i, theEl) {
          return theEl.parentNode.removeChild(theEl);
        });
        text = $dom.text().replace(lineRgx, '\n');
        text = text.split(splitterToken).shift();
        winner = void 0;
        best = 999999;
        txt = text.toLowerCase();
        for (_i = 0, _len = hints.length; _i < _len; _i++) {
          hint = hints[_i];
          search = txt.indexOf(hint);
          if (search >= 0 && search < best) {
            best = search;
            winner = hint;
          }
        }
        if (winner != null) {
          return winner;
        }
        p = p.parentElement;
      } catch (_error) {
        error = _error;
        console.log("Section Error:", error);
        break;
      }
    }
    return void 0;
  }
};

});

require.register("widget/fields/input", function(exports, require, module) {
var FormInput, MetaData;

MetaData = require('widget/fields/metadata');

module.exports = FormInput = (function() {
  function FormInput(el) {
    var _ref;
    this.el = el;
    this.name = (_ref = this.el.attributes.name) != null ? _ref.value : void 0;
    this.metadata = new MetaData(this.el);
    this.mapping = void 0;
  }

  FormInput.prototype.popID = function() {
    return this.metadata.pop_id.toString();
  };

  FormInput.prototype.ignore = function() {
    return this.metadata.ignore;
  };

  return FormInput;

})();

});

require.register("widget/fields/label", function(exports, require, module) {
var LabelHelper, jQuery;

jQuery = require('widget/lib/jquery');

module.exports = LabelHelper = (function() {
  LabelHelper.detect = function(el) {
    return new LabelHelper(el);
  };

  function LabelHelper(el) {
    this.el = jQuery(el);
    this.selector = null;
    this.process();
  }

  LabelHelper.prototype.process = function() {
    var e, label, labels, strategy, _i, _j, _len, _len1, _ref, _ref1;
    labels = [];
    if (this.el.labels !== null && typeof this.el.labels !== 'undefined') {
      _ref = this.el.labels;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        e = _ref[_i];
        labels.push(this.labelTextContent(e));
      }
    }
    if (labels.length > 0) {
      this.confidence = 1;
      return this.label = labels.join(' ');
    } else {
      _ref1 = this.strategies();
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        strategy = _ref1[_j];
        if (label = this.trim(strategy.call(this))) {
          if (label.length <= 30) {
            console.log("Label", this.el, label, strategy);
            this.confidence = 0.1;
            this.label = label;
            return;
          }
        }
      }
    }
  };

  LabelHelper.prototype.trim = function(el) {
    var val;
    if (el) {
      val = '';
      if (typeof el === 'object') {
        if (el.length === 1 && this.valid(el)) {
          val = el.text();
        }
      } else {
        val = el;
      }
      val = val.trim();
      val = val.replace(/[&\/\\#,+()$~%.'"*?<>{}]/g, '');
      val = val.replace(/[\*\:\s]*$/g, '').trim();
      if (val !== '') {
        this.selector = el.selector;
        return val;
      }
      return false;
    }
  };

  LabelHelper.prototype.valid = function(el) {
    if (el.first().attr('for') === this.el.attr('id') || el.first().attr('for') === this.el.attr('name') || el.first().attr('for') === '' || el.first().attr('for') === void 0) {
      return true;
    } else {
      return false;
    }
  };

  LabelHelper.prototype.strategies = function() {
    return [
      function() {
        return jQuery('label[for="' + this.el.attr('name') + '"]');
      }, function() {
        var cloned, lbl, txt;
        lbl = this.el.closest('label');
        if (lbl.length > 0) {
          cloned = lbl.clone();
          cloned.find('select,option,script,input,style').remove();
          txt = cloned.text().trim();
          if (txt.length > 0 && txt.length < 30) {
            return txt;
          }
        }
      }, function() {
        if (this.el.prev().prop('tagName') === "LABEL") {
          return this.el.prev();
        }
      }, function() {
        if (this.el.parent().find('label').length === 1) {
          if (this.el.next().prop('tagName') === "LABEL") {
            return this.el.next();
          }
        }
      }, function() {
        if (this.el.prev().prop('tagName') === "P") {
          if (this.el.prev().contents().length === 1) {
            return this.el.prev().contents().first();
          }
        }
      }, function() {
        var chunks, cloned, prior, sel, text;
        cloned = this.el.closest('body').clone();
        if (cloned.length === 0) {
          return null;
        }
        if (typeof this.el.attr('id') !== 'undefined') {
          sel = this.el.attr('id').replace(/([ #;&,.+*~\':"!^$[\]()=>|\/])/g, '\\$1');
          cloned.find("#" + sel).replaceWith('FILLRSPLIT');
        } else if (typeof this.el.attr('name') !== 'undefined') {
          sel = this.el.attr('name').replace(/([ #;&,.+*~\':"!^$[\]()=>|\/])/g, '\\$1');
          cloned.find("[name=" + sel + "]").replaceWith('FILLRSPLIT');
        } else {
          return null;
        }
        cloned.find('script,input,select,style').each(function(i, theEl) {
          return theEl.parentNode.removeChild(theEl);
        });
        if (cloned.length === 0) {
          return null;
        }
        text = cloned.text().replace(/\s{2,}/gi, '\n');
        chunks = text.split('FILLRSPLIT');
        if (chunks.length === 2) {
          prior = chunks[0].trim().split('\n');
          return prior.pop();
        }
      }, function() {
        return this.el.closest('dd').prev('dt');
      }, function() {
        var td;
        td = this.el.parent('td').prev('td');
        if (td.find('input,select').length === 0) {
          return td;
        }
      }, function() {
        var td;
        td = this.el.closest('td').prev('td');
        if (td.find('input,select').length === 0) {
          return td;
        }
      }, function() {
        var td;
        td = this.el.parent('td').siblings('td').filter(':first');
        if (td.find('input,select').length === 0) {
          return td;
        }
      }, function() {
        return this.el.parent().find(':not(script):not(select):not(input):not(br):not(option)');
      }, function() {
        return this.el.parent().find('label');
      }, function() {
        return this.el.parent().parent().find('label');
      }, function() {
        var input;
        input = this.el.closest('tr').find('input,select');
        if (input.length === 1 && input.get(0) === this.el.get(0)) {
          return this.el.closest('tr').text().trim();
        }
      }
    ];
  };

  LabelHelper.labelTextContent = function(el) {
    var clone;
    clone = jQuery(el).clone();
    clone.find('input,select').each(function(index, el) {
      return el.parentNode.removeChild(el);
    });
    return clone[0].textContent;
  };

  return LabelHelper;

})();

});

require.register("widget/fields/legend", function(exports, require, module) {
var LegendHelper, jQuery;

jQuery = require('widget/lib/jquery');

module.exports = LegendHelper = (function() {
  function LegendHelper() {}

  LegendHelper.detect = function(el) {
    var legends;
    legends = jQuery(el).closest('fieldset').find('legend');
    if (legends && legends.length === 1) {
      return legends.text();
    }
    return '';
  };

  return LegendHelper;

})();

});

require.register("widget/fields/metadata", function(exports, require, module) {
var Label, Legend, MetaData, jQuery;

Label = require('widget/fields/label');

Legend = require('widget/fields/legend');

jQuery = require('widget/lib/jquery');

module.exports = MetaData = (function() {
  function MetaData(el) {
    var lh;
    this.id = this._value(el, 'id');
    this.name = this._value(el, 'name');
    this.placeholder = this._value(el, 'placeholder');
    this.max_length = this._value(el, 'maxLength');
    if (!this.placeholder && el.type === 'select-one') {
      if (el.options.length > 0) {
        this.placeholder = el.options[0].text;
      }
    }
    if (!this.placeholder) {
      this.placeholder = this._value(el, 'value');
    }
    this.type = this._buildType(el);
    this.tag_name = this._tagName(el);
    this.pop_id = this._popID();
    if (!(this.ignore = this._buildIgnore(el))) {
      lh = Label.detect(el);
      this.label = lh.label;
      this.label_confidence = lh.confidence;
      this.legend = Legend.detect(el);
      this.autocompletetype = this._value(el, 'x-autocompletetype');
      this.autocomplete = this._value(el, 'autocomplete');
    }
  }

  MetaData.prototype._value = function(el, val) {
    var _ref;
    return (_ref = el.attributes[val]) != null ? _ref.value : void 0;
  };

  MetaData.prototype._buildIgnore = function(el) {
    var _ref;
    return (_ref = this._buildType(el)) === 'submit' || _ref === 'reset' || _ref === 'search' || _ref === 'password' || _ref === 'file' || _ref === 'hidden' || _ref === 'color';
  };

  MetaData.prototype._buildType = function(el) {
    var _ref, _ref1;
    return (_ref = el.attributes) != null ? (_ref1 = _ref.type) != null ? _ref1.value : void 0 : void 0;
  };

  MetaData.prototype._tagName = function(el) {
    return el.tagName.toLowerCase();
  };

  MetaData.prototype._popID = function() {
    return Math.floor((1 + Math.random()) * 0x10000);
  };

  return MetaData;

})();

});

require.register("widget/interfaces/android_sdk", function(exports, require, module) {
var Fields, Mappings, Pop;

Mappings = require('widget/pop/mappings');

Fields = require('widget/fields');

Pop = require('widget/pop');

module.exports = {
  getFields: function() {
    console.log("Get Fields Called");
    return androidInterface.setFields(JSON.stringify(Mappings.payload(Fields.detect(document))));
  },
  populateWithMappings: function(mappedFields, popData) {
    return Pop.create({
      mappedFields: mappedFields,
      popData: popData
    });
  },
  require: function(args) {
    return require(args);
  }
};

});

require.register("widget/interfaces/ios_sdk", function(exports, require, module) {
var Fields, Mappings, Pop;

Mappings = require('widget/pop/mappings');

Fields = require('widget/fields');

Pop = require('widget/pop');

module.exports = {
  getFields: function() {
    console.log("Get Fields Called");
    return JSON.stringify(Mappings.payload(Fields.detect(document)));
  },
  populateWithMappings: function(mappedFields, popData) {
    return Pop.create({
      mappedFields: mappedFields,
      popData: popData
    });
  },
  require: function(args) {
    return require(args);
  }
};

});

require.register("widget/lib/countries", function(exports, require, module) {
(function() {
  var Countries, root;
  Countries = [
    {
      "name": "Afghanistan",
      "cca2": "AF",
      "callingCode": "93",
      "altSpellings": [
        "AF",
        "Afġānistān"
      ]
    },
    {
      "name": "Åland Islands",
      "cca2": "AX",
      "callingCode": "358",
      "altSpellings": [
        "AX",
        "Aaland",
        "Aland",
        "Ahvenanmaa"
      ]
    },
    {
      "name": "Albania",
      "cca2": "AL",
      "callingCode": "355",
      "altSpellings": [
        "AL",
        "Shqipëri",
        "Shqipëria",
        "Shqipnia"
      ]
    },
    {
      "name": "Algeria",
      "cca2": "DZ",
      "callingCode": "213",
      "altSpellings": [
        "DZ",
        "Dzayer",
        "Algérie"
      ]
    },
    {
      "name": "American Samoa",
      "cca2": "AS",
      "callingCode": "1684",
      "altSpellings": [
        "AS",
        "Amerika Sāmoa",
        "Amelika Sāmoa",
        "Sāmoa Amelika"
      ]
    },
    {
      "name": "Andorra",
      "cca2": "AD",
      "callingCode": "376",
      "altSpellings": [
        "AD",
        "Principality of Andorra",
        "Principat d'Andorra"
      ]
    },
    {
      "name": "Angola",
      "cca2": "AO",
      "callingCode": "244",
      "altSpellings": [
        "AO",
        "República de Angola",
        "ʁɛpublika de an'ɡɔla"
      ]
    },
    {
      "name": "Anguilla",
      "cca2": "AI",
      "callingCode": "1264",
      "altSpellings": "AI"
    },
    {
      "name": "Antarctica",
      "cca2": "AQ",
      "callingCode": "",
      "altSpellings": "AQ"
    },
    {
      "name": "Antigua and Barbuda",
      "cca2": "AG",
      "callingCode": "1268",
      "altSpellings": "AG"
    },
    {
      "name": "Argentina",
      "cca2": "AR",
      "callingCode": "54",
      "altSpellings": [
        "AR",
        "Argentine Republic",
        "República Argentina"
      ]
    },
    {
      "name": "Armenia",
      "cca2": "AM",
      "callingCode": "374",
      "altSpellings": [
        "AM",
        "Hayastan",
        "Republic of Armenia",
        "Հայաստանի Հանրապետություն"
      ]
    },
    {
      "name": "Aruba",
      "cca2": "AW",
      "callingCode": "297",
      "altSpellings": "AW"
    },
    {
      "name": "Australia",
      "cca2": "AU",
      "callingCode": "61",
      "altSpellings": "AU"
    },
    {
      "name": "Austria",
      "cca2": "AT",
      "callingCode": "43",
      "altSpellings": [
        "AT",
        "Österreich",
        "Osterreich",
        "Oesterreich"
      ]
    },
    {
      "name": "Azerbaijan",
      "cca2": "AZ",
      "callingCode": "994",
      "altSpellings": [
        "AZ",
        "Republic of Azerbaijan",
        "Azərbaycan Respublikası"
      ]
    },
    {
      "name": "Bahamas",
      "cca2": "BS",
      "callingCode": "1242",
      "altSpellings": [
        "BS",
        "Commonwealth of the Bahamas"
      ]
    },
    {
      "name": "Bahrain",
      "cca2": "BH",
      "callingCode": "973",
      "altSpellings": [
        "BH",
        "Kingdom of Bahrain",
        "Mamlakat al-Baḥrayn"
      ]
    },
    {
      "name": "Bangladesh",
      "cca2": "BD",
      "callingCode": "880",
      "altSpellings": [
        "BD",
        "People's Republic of Bangladesh",
        "Gônôprôjatôntri Bangladesh"
      ]
    },
    {
      "name": "Barbados",
      "cca2": "BB",
      "callingCode": "1246",
      "altSpellings": "BB"
    },
    {
      "name": "Belarus",
      "cca2": "BY",
      "callingCode": "375",
      "altSpellings": [
        "BY",
        "Bielaruś",
        "Republic of Belarus",
        "Белоруссия",
        "Республика Беларусь",
        "Belorussiya",
        "Respublika Belarus’"
      ]
    },
    {
      "name": "Belgium",
      "cca2": "BE",
      "callingCode": "32",
      "altSpellings": [
        "BE",
        "België",
        "Belgie",
        "Belgien",
        "Belgique",
        "Kingdom of Belgium",
        "Koninkrijk België",
        "Royaume de Belgique",
        "Königreich Belgien"
      ]
    },
    {
      "name": "Belize",
      "cca2": "BZ",
      "callingCode": "501",
      "altSpellings": "BZ"
    },
    {
      "name": "Benin",
      "cca2": "BJ",
      "callingCode": "229",
      "altSpellings": [
        "BJ",
        "Republic of Benin",
        "République du Bénin"
      ]
    },
    {
      "name": "Bermuda",
      "cca2": "BM",
      "callingCode": "1441",
      "altSpellings": [
        "BM",
        "The Islands of Bermuda",
        "The Bermudas",
        "Somers Isles"
      ]
    },
    {
      "name": "Bhutan",
      "cca2": "BT",
      "callingCode": "975",
      "altSpellings": [
        "BT",
        "Kingdom of Bhutan"
      ]
    },
    {
      "name": "Bolivia",
      "cca2": "BO",
      "callingCode": "591",
      "altSpellings": [
        "BO",
        "Buliwya",
        "Wuliwya",
        "Plurinational State of Bolivia",
        "Estado Plurinacional de Bolivia",
        "Buliwya Mamallaqta",
        "Wuliwya Suyu",
        "Tetã Volívia"
      ]
    },
    {
      "name": "Bonaire",
      "cca2": "BQ",
      "callingCode": "5997",
      "altSpellings": [
        "BQ",
        "Boneiru"
      ]
    },
    {
      "name": "Bosnia and Herzegovina",
      "cca2": "BA",
      "callingCode": "387",
      "altSpellings": [
        "BA",
        "Bosnia-Herzegovina",
        "Босна и Херцеговина"
      ]
    },
    {
      "name": "Botswana",
      "cca2": "BW",
      "callingCode": "267",
      "altSpellings": [
        "BW",
        "Republic of Botswana",
        "Lefatshe la Botswana"
      ]
    },
    {
      "name": "Bouvet Island",
      "cca2": "BV",
      "callingCode": "",
      "altSpellings": [
        "BV",
        "Bouvetøya",
        "Bouvet-øya"
      ]
    },
    {
      "name": "Brazil",
      "cca2": "BR",
      "callingCode": "55",
      "altSpellings": [
        "BR",
        "Brasil",
        "Federative Republic of Brazil",
        "República Federativa do Brasil"
      ]
    },
    {
      "name": "British Indian Ocean Territory",
      "cca2": "IO",
      "callingCode": "246",
      "altSpellings": "IO"
    },
    {
      "name": "British Virgin Islands",
      "cca2": "VG",
      "callingCode": "1284",
      "altSpellings": "VG"
    },
    {
      "name": "Brunei",
      "cca2": "BN",
      "callingCode": "673",
      "altSpellings": [
        "BN",
        "Nation of Brunei",
        " the Abode of Peace"
      ]
    },
    {
      "name": "Bulgaria",
      "cca2": "BG",
      "callingCode": "359",
      "altSpellings": [
        "BG",
        "Republic of Bulgaria",
        "Република България"
      ]
    },
    {
      "name": "Burkina Faso",
      "cca2": "BF",
      "callingCode": "226",
      "altSpellings": "BF"
    },
    {
      "name": "Burundi",
      "cca2": "BI",
      "callingCode": "257",
      "altSpellings": [
        "BI",
        "Republic of Burundi",
        "Republika y'Uburundi",
        "République du Burundi"
      ]
    },
    {
      "name": "Cambodia",
      "cca2": "KH",
      "callingCode": "855",
      "altSpellings": [
        "KH",
        "Kingdom of Cambodia"
      ]
    },
    {
      "name": "Cameroon",
      "cca2": "CM",
      "callingCode": "237",
      "altSpellings": [
        "CM",
        "Republic of Cameroon",
        "République du Cameroun"
      ]
    },
    {
      "name": "Canada",
      "cca2": "CA",
      "callingCode": "1",
      "altSpellings": "CA"
    },
    {
      "name": "Cape Verde",
      "cca2": "CV",
      "callingCode": "238",
      "altSpellings": [
        "CV",
        "Republic of Cabo Verde",
        "República de Cabo Verde"
      ]
    },
    {
      "name": "Cayman Islands",
      "cca2": "KY",
      "callingCode": "1345",
      "altSpellings": "KY"
    },
    {
      "name": "Central African Republic",
      "cca2": "CF",
      "callingCode": "236",
      "altSpellings": [
        "CF",
        "Central African Republic",
        "République centrafricaine"
      ]
    },
    {
      "name": "Chad",
      "cca2": "TD",
      "callingCode": "235",
      "altSpellings": [
        "TD",
        "Tchad",
        "Republic of Chad",
        "République du Tchad"
      ]
    },
    {
      "name": "Chile",
      "cca2": "CL",
      "callingCode": "56",
      "altSpellings": [
        "CL",
        "Republic of Chile",
        "República de Chile"
      ]
    },
    {
      "name": "China",
      "cca2": "CN",
      "callingCode": "86",
      "altSpellings": [
        "CN",
        "Zhōngguó",
        "Zhongguo",
        "Zhonghua",
        "People's Republic of China",
        "中华人民共和国",
        "Zhōnghuá Rénmín Gònghéguó"
      ]
    },
    {
      "name": "Colombia",
      "cca2": "CO",
      "callingCode": "57",
      "altSpellings": [
        "CO",
        "Republic of Colombia",
        "República de Colombia"
      ]
    },
    {
      "name": "Comoros",
      "cca2": "KM",
      "callingCode": "269",
      "altSpellings": [
        "KM",
        "Union of the Comoros",
        "Union des Comores",
        "Udzima wa Komori",
        "al-Ittiḥād al-Qumurī"
      ]
    },
    {
      "name": "Republic of the Congo",
      "cca2": "CG",
      "callingCode": "242",
      "altSpellings": [
        "CG",
        "Congo-Brazzaville"
      ]
    },
    {
      "name": "Democratic Republic of the Congo",
      "cca2": "CD",
      "callingCode": "243",
      "altSpellings": [
        "CD",
        "DR Congo",
        "Congo-Kinshasa",
        "DRC"
      ]
    },
    {
      "name": "Cook Islands",
      "cca2": "CK",
      "callingCode": "682",
      "altSpellings": [
        "CK",
        "Kūki 'Āirani"
      ]
    },
    {
      "name": "Costa Rica",
      "cca2": "CR",
      "callingCode": "506",
      "altSpellings": [
        "CR",
        "Republic of Costa Rica",
        "República de Costa Rica"
      ]
    },
    {
      "name": "Côte d'Ivoire",
      "cca2": "CI",
      "callingCode": "225",
      "altSpellings": [
        "CI",
        "Ivory Coast",
        "Republic of Côte d'Ivoire",
        "République de Côte d'Ivoire"
      ]
    },
    {
      "name": "Croatia",
      "cca2": "HR",
      "callingCode": "385",
      "altSpellings": [
        "HR",
        "Hrvatska",
        "Republic of Croatia",
        "Republika Hrvatska"
      ]
    },
    {
      "name": "Cuba",
      "cca2": "CU",
      "callingCode": "53",
      "altSpellings": [
        "CU",
        "Republic of Cuba",
        "República de Cuba"
      ]
    },
    {
      "name": "Curaçao",
      "cca2": "CW",
      "callingCode": "5999",
      "altSpellings": [
        "CW",
        "Curacao",
        "Kòrsou",
        "Country of Curaçao",
        "Land Curaçao",
        "Pais Kòrsou"
      ]
    },
    {
      "name": "Cyprus",
      "cca2": "CY",
      "callingCode": "357",
      "altSpellings": [
        "CY",
        "Kýpros",
        "Kıbrıs",
        "Republic of Cyprus",
        "Κυπριακή Δημοκρατία",
        "Kıbrıs Cumhuriyeti"
      ]
    },
    {
      "name": "Czech Republic",
      "cca2": "CZ",
      "callingCode": "420",
      "altSpellings": [
        "CZ",
        "Česká republika",
        "Česko"
      ]
    },
    {
      "name": "Denmark",
      "cca2": "DK",
      "callingCode": "45",
      "altSpellings": [
        "DK",
        "Danmark",
        "Kingdom of Denmark",
        "Kongeriget Danmark"
      ]
    },
    {
      "name": "Djibouti",
      "cca2": "DJ",
      "callingCode": "253",
      "altSpellings": [
        "DJ",
        "Jabuuti",
        "Gabuuti",
        "Republic of Djibouti",
        "République de Djibouti",
        "Gabuutih Ummuuno",
        "Jamhuuriyadda Jabuuti"
      ]
    },
    {
      "name": "Dominica",
      "cca2": "DM",
      "callingCode": "1767",
      "altSpellings": [
        "DM",
        "Dominique",
        "Wai‘tu kubuli",
        "Commonwealth of Dominica"
      ]
    },
    {
      "name": "Dominican Republic",
      "cca2": "DO",
      "callingCode": [
        "1809",
        "1829",
        "1849"
      ],
      "altSpellings": "DO"
    },
    {
      "name": "Ecuador",
      "cca2": "EC",
      "callingCode": "593",
      "altSpellings": [
        "EC",
        "Republic of Ecuador",
        "República del Ecuador"
      ]
    },
    {
      "name": "Egypt",
      "cca2": "EG",
      "callingCode": "20",
      "altSpellings": [
        "EG",
        "Arab Republic of Egypt"
      ]
    },
    {
      "name": "El Salvador",
      "cca2": "SV",
      "callingCode": "503",
      "altSpellings": [
        "SV",
        "Republic of El Salvador",
        "República de El Salvador"
      ]
    },
    {
      "name": "Equatorial Guinea",
      "cca2": "GQ",
      "callingCode": "240",
      "altSpellings": [
        "GQ",
        "Republic of Equatorial Guinea",
        "República de Guinea Ecuatorial",
        "République de Guinée équatoriale",
        "República da Guiné Equatorial"
      ]
    },
    {
      "name": "Eritrea",
      "cca2": "ER",
      "callingCode": "291",
      "altSpellings": [
        "ER",
        "State of Eritrea",
        "ሃገረ ኤርትራ",
        "Dawlat Iritriyá",
        "ʾErtrā",
        "Iritriyā",
        ""
      ]
    },
    {
      "name": "Estonia",
      "cca2": "EE",
      "callingCode": "372",
      "altSpellings": [
        "EE",
        "Eesti",
        "Republic of Estonia",
        "Eesti Vabariik"
      ]
    },
    {
      "name": "Ethiopia",
      "cca2": "ET",
      "callingCode": "251",
      "altSpellings": [
        "ET",
        "ʾĪtyōṗṗyā",
        "Federal Democratic Republic of Ethiopia",
        "የኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ"
      ]
    },
    {
      "name": "Falkland Islands",
      "cca2": "FK",
      "callingCode": "500",
      "altSpellings": [
        "FK",
        "Islas Malvinas"
      ]
    },
    {
      "name": "Faroe Islands",
      "cca2": "FO",
      "callingCode": "298",
      "altSpellings": [
        "FO",
        "Føroyar",
        "Færøerne"
      ]
    },
    {
      "name": "Fiji",
      "cca2": "FJ",
      "callingCode": "679",
      "altSpellings": [
        "FJ",
        "Viti",
        "Republic of Fiji",
        "Matanitu ko Viti",
        "Fijī Gaṇarājya"
      ]
    },
    {
      "name": "Finland",
      "cca2": "FI",
      "callingCode": "358",
      "altSpellings": [
        "FI",
        "Suomi",
        "Republic of Finland",
        "Suomen tasavalta",
        "Republiken Finland"
      ]
    },
    {
      "name": "France",
      "cca2": "FR",
      "callingCode": "33",
      "altSpellings": [
        "FR",
        "French Republic",
        "République française"
      ]
    },
    {
      "name": "French Guiana",
      "cca2": "GF",
      "callingCode": "594",
      "altSpellings": [
        "GF",
        "Guiana",
        "Guyane"
      ]
    },
    {
      "name": "French Polynesia",
      "cca2": "PF",
      "callingCode": "689",
      "altSpellings": [
        "PF",
        "Polynésie française",
        "French Polynesia",
        "Pōrīnetia Farāni"
      ]
    },
    {
      "name": "French Southern and Antarctic Lands",
      "cca2": "TF",
      "callingCode": "",
      "altSpellings": "TF"
    },
    {
      "name": "Gabon",
      "cca2": "GA",
      "callingCode": "241",
      "altSpellings": [
        "GA",
        "Gabonese Republic",
        "République Gabonaise"
      ]
    },
    {
      "name": "Gambia",
      "cca2": "GM",
      "callingCode": "220",
      "altSpellings": [
        "GM",
        "Republic of the Gambia"
      ]
    },
    {
      "name": "Georgia",
      "cca2": "GE",
      "callingCode": "995",
      "altSpellings": [
        "GE",
        "Sakartvelo"
      ]
    },
    {
      "name": "Germany",
      "cca2": "DE",
      "callingCode": "49",
      "altSpellings": [
        "DE",
        "Federal Republic of Germany",
        "Bundesrepublik Deutschland"
      ]
    },
    {
      "name": "Ghana",
      "cca2": "GH",
      "callingCode": "233",
      "altSpellings": "GH"
    },
    {
      "name": "Gibraltar",
      "cca2": "GI",
      "callingCode": "350",
      "altSpellings": "GI"
    },
    {
      "name": "Greece",
      "cca2": "GR",
      "callingCode": "30",
      "altSpellings": [
        "GR",
        "Elláda",
        "Hellenic Republic",
        "Ελληνική Δημοκρατία"
      ]
    },
    {
      "name": "Greenland",
      "cca2": "GL",
      "callingCode": "299",
      "altSpellings": [
        "GL",
        "Grønland"
      ]
    },
    {
      "name": "Grenada",
      "cca2": "GD",
      "callingCode": "1473",
      "altSpellings": "GD"
    },
    {
      "name": "Guadeloupe",
      "cca2": "GP",
      "callingCode": "590",
      "altSpellings": [
        "GP",
        "Gwadloup"
      ]
    },
    {
      "name": "Guam",
      "cca2": "GU",
      "callingCode": "1671",
      "altSpellings": [
        "GU",
        "Guåhån"
      ]
    },
    {
      "name": "Guatemala",
      "cca2": "GT",
      "callingCode": "502",
      "altSpellings": "GT"
    },
    {
      "name": "Guernsey",
      "cca2": "GG",
      "callingCode": "44",
      "altSpellings": [
        "GG",
        "Bailiwick of Guernsey",
        "Bailliage de Guernesey"
      ]
    },
    {
      "name": "Guinea",
      "cca2": "GN",
      "callingCode": "224",
      "altSpellings": [
        "GN",
        "Republic of Guinea",
        "République de Guinée"
      ]
    },
    {
      "name": "Guinea-Bissau",
      "cca2": "GW",
      "callingCode": "245",
      "altSpellings": [
        "GW",
        "Republic of Guinea-Bissau",
        "República da Guiné-Bissau"
      ]
    },
    {
      "name": "Guyana",
      "cca2": "GY",
      "callingCode": "592",
      "altSpellings": [
        "GY",
        "Co-operative Republic of Guyana"
      ]
    },
    {
      "name": "Haiti",
      "cca2": "HT",
      "callingCode": "509",
      "altSpellings": [
        "HT",
        "Republic of Haiti",
        "République d'Haïti",
        "Repiblik Ayiti"
      ]
    },
    {
      "name": "Heard Island and McDonald Islands",
      "cca2": "HM",
      "callingCode": "",
      "altSpellings": "HM"
    },
    {
      "name": "Vatican City",
      "cca2": "VA",
      "callingCode": [
        "39066",
        "379"
      ],
      "altSpellings": [
        "VA",
        "Vatican City State",
        "Stato della Città del Vaticano"
      ]
    },
    {
      "name": "Honduras",
      "cca2": "HN",
      "callingCode": "504",
      "altSpellings": [
        "HN",
        "Republic of Honduras",
        "República de Honduras"
      ]
    },
    {
      "name": "Hong Kong",
      "cca2": "HK",
      "callingCode": "852",
      "altSpellings": [
        "HK",
        "香港"
      ]
    },
    {
      "name": "Hungary",
      "cca2": "HU",
      "callingCode": "36",
      "altSpellings": "HU"
    },
    {
      "name": "Iceland",
      "cca2": "IS",
      "callingCode": "354",
      "altSpellings": [
        "IS",
        "Island",
        "Republic of Iceland",
        "Lýðveldið Ísland"
      ]
    },
    {
      "name": "India",
      "cca2": "IN",
      "callingCode": "91",
      "altSpellings": [
        "IN",
        "Bhārat",
        "Republic of India",
        "Bharat Ganrajya"
      ]
    },
    {
      "name": "Indonesia",
      "cca2": "ID",
      "callingCode": "62",
      "altSpellings": [
        "ID",
        "Republic of Indonesia",
        "Republik Indonesia"
      ]
    },
    {
      "name": "Iran",
      "cca2": "IR",
      "callingCode": "98",
      "altSpellings": [
        "IR",
        "Islamic Republic of Iran",
        "Jomhuri-ye Eslāmi-ye Irān"
      ]
    },
    {
      "name": "Iraq",
      "cca2": "IQ",
      "callingCode": "964",
      "altSpellings": [
        "IQ",
        "Republic of Iraq",
        "Jumhūriyyat al-‘Irāq"
      ]
    },
    {
      "name": "Ireland",
      "cca2": "IE",
      "callingCode": "353",
      "altSpellings": [
        "IE",
        "Éire",
        "Republic of Ireland",
        "Poblacht na hÉireann"
      ]
    },
    {
      "name": "Isle of Man",
      "cca2": "IM",
      "callingCode": "44",
      "altSpellings": [
        "IM",
        "Ellan Vannin",
        "Mann",
        "Mannin"
      ]
    },
    {
      "name": "Israel",
      "cca2": "IL",
      "callingCode": "972",
      "altSpellings": [
        "IL",
        "State of Israel",
        "Medīnat Yisrā'el"
      ]
    },
    {
      "name": "Italy",
      "cca2": "IT",
      "callingCode": "39",
      "altSpellings": [
        "IT",
        "Italian Republic",
        "Repubblica italiana"
      ]
    },
    {
      "name": "Jamaica",
      "cca2": "JM",
      "callingCode": "1876",
      "altSpellings": "JM"
    },
    {
      "name": "Japan",
      "cca2": "JP",
      "callingCode": "81",
      "altSpellings": [
        "JP",
        "Nippon",
        "Nihon"
      ]
    },
    {
      "name": "Jersey",
      "cca2": "JE",
      "callingCode": "44",
      "altSpellings": [
        "JE",
        "Bailiwick of Jersey",
        "Bailliage de Jersey",
        "Bailliage dé Jèrri"
      ]
    },
    {
      "name": "Jordan",
      "cca2": "JO",
      "callingCode": "962",
      "altSpellings": [
        "JO",
        "Hashemite Kingdom of Jordan",
        "al-Mamlakah al-Urdunīyah al-Hāshimīyah"
      ]
    },
    {
      "name": "Kazakhstan",
      "cca2": "KZ",
      "callingCode": [
        "76",
        "77"
      ],
      "altSpellings": [
        "KZ",
        "Qazaqstan",
        "Казахстан",
        "Republic of Kazakhstan",
        "Қазақстан Республикасы",
        "Qazaqstan Respublïkası",
        "Республика Казахстан",
        "Respublika Kazakhstan"
      ]
    },
    {
      "name": "Kenya",
      "cca2": "KE",
      "callingCode": "254",
      "altSpellings": [
        "KE",
        "Republic of Kenya",
        "Jamhuri ya Kenya"
      ]
    },
    {
      "name": "Kiribati",
      "cca2": "KI",
      "callingCode": "686",
      "altSpellings": [
        "KI",
        "Republic of Kiribati",
        "Ribaberiki Kiribati"
      ]
    },
    {
      "name": "Kuwait",
      "cca2": "KW",
      "callingCode": "965",
      "altSpellings": [
        "KW",
        "State of Kuwait",
        "Dawlat al-Kuwait"
      ]
    },
    {
      "name": "Kyrgyzstan",
      "cca2": "KG",
      "callingCode": "996",
      "altSpellings": [
        "KG",
        "Киргизия",
        "Kyrgyz Republic",
        "Кыргыз Республикасы",
        "Kyrgyz Respublikasy"
      ]
    },
    {
      "name": "Laos",
      "cca2": "LA",
      "callingCode": "856",
      "altSpellings": [
        "LA",
        "Lao",
        "Lao People's Democratic Republic",
        "Sathalanalat Paxathipatai Paxaxon Lao"
      ]
    },
    {
      "name": "Latvia",
      "cca2": "LV",
      "callingCode": "371",
      "altSpellings": [
        "LV",
        "Republic of Latvia",
        "Latvijas Republika"
      ]
    },
    {
      "name": "Lebanon",
      "cca2": "LB",
      "callingCode": "961",
      "altSpellings": [
        "LB",
        "Lebanese Republic",
        "Al-Jumhūrīyah Al-Libnānīyah"
      ]
    },
    {
      "name": "Lesotho",
      "cca2": "LS",
      "callingCode": "266",
      "altSpellings": [
        "LS",
        "Kingdom of Lesotho",
        "Muso oa Lesotho"
      ]
    },
    {
      "name": "Liberia",
      "cca2": "LR",
      "callingCode": "231",
      "altSpellings": [
        "LR",
        "Republic of Liberia"
      ]
    },
    {
      "name": "Libya",
      "cca2": "LY",
      "callingCode": "218",
      "altSpellings": [
        "LY",
        "State of Libya",
        "Dawlat Libya"
      ]
    },
    {
      "name": "Liechtenstein",
      "cca2": "LI",
      "callingCode": "423",
      "altSpellings": [
        "LI",
        "Principality of Liechtenstein",
        "Fürstentum Liechtenstein"
      ]
    },
    {
      "name": "Lithuania",
      "cca2": "LT",
      "callingCode": "370",
      "altSpellings": [
        "LT",
        "Republic of Lithuania",
        "Lietuvos Respublika"
      ]
    },
    {
      "name": "Luxembourg",
      "cca2": "LU",
      "callingCode": "352",
      "altSpellings": [
        "LU",
        "Grand Duchy of Luxembourg",
        "Grand-Duché de Luxembourg",
        "Großherzogtum Luxemburg",
        "Groussherzogtum Lëtzebuerg"
      ]
    },
    {
      "name": "Macao",
      "cca2": "MO",
      "callingCode": "853",
      "altSpellings": [
        "MO",
        "澳门",
        "Macao Special Administrative Region of the People's Republic of China",
        "中華人民共和國澳門特別行政區",
        "Região Administrativa Especial de Macau da República Popular da China"
      ]
    },
    {
      "name": "Macedonia",
      "cca2": "MK",
      "callingCode": "389",
      "altSpellings": [
        "MK",
        "Republic of Macedonia",
        "Република Македонија"
      ]
    },
    {
      "name": "Madagascar",
      "cca2": "MG",
      "callingCode": "261",
      "altSpellings": [
        "MG",
        "Republic of Madagascar",
        "Repoblikan'i Madagasikara",
        "République de Madagascar"
      ]
    },
    {
      "name": "Malawi",
      "cca2": "MW",
      "callingCode": "265",
      "altSpellings": [
        "MW",
        "Republic of Malawi"
      ]
    },
    {
      "name": "Malaysia",
      "cca2": "MY",
      "callingCode": "60",
      "altSpellings": "MY"
    },
    {
      "name": "Maldives",
      "cca2": "MV",
      "callingCode": "960",
      "altSpellings": [
        "MV",
        "Maldive Islands",
        "Republic of the Maldives",
        "Dhivehi Raajjeyge Jumhooriyya"
      ]
    },
    {
      "name": "Mali",
      "cca2": "ML",
      "callingCode": "223",
      "altSpellings": [
        "ML",
        "Republic of Mali",
        "République du Mali"
      ]
    },
    {
      "name": "Malta",
      "cca2": "MT",
      "callingCode": "356",
      "altSpellings": [
        "MT",
        "Republic of Malta",
        "Repubblika ta' Malta"
      ]
    },
    {
      "name": "Marshall Islands",
      "cca2": "MH",
      "callingCode": "692",
      "altSpellings": [
        "MH",
        "Republic of the Marshall Islands",
        "Aolepān Aorōkin M̧ajeļ"
      ]
    },
    {
      "name": "Martinique",
      "cca2": "MQ",
      "callingCode": "596",
      "altSpellings": "MQ"
    },
    {
      "name": "Mauritania",
      "cca2": "MR",
      "callingCode": "222",
      "altSpellings": [
        "MR",
        "Islamic Republic of Mauritania",
        "al-Jumhūriyyah al-ʾIslāmiyyah al-Mūrītāniyyah"
      ]
    },
    {
      "name": "Mauritius",
      "cca2": "MU",
      "callingCode": "230",
      "altSpellings": [
        "MU",
        "Republic of Mauritius",
        "République de Maurice"
      ]
    },
    {
      "name": "Mayotte",
      "cca2": "YT",
      "callingCode": "262",
      "altSpellings": [
        "YT",
        "Department of Mayotte",
        "Département de Mayotte"
      ]
    },
    {
      "name": "Mexico",
      "cca2": "MX",
      "callingCode": "52",
      "altSpellings": [
        "MX",
        "Mexicanos",
        "United Mexican States",
        "Estados Unidos Mexicanos"
      ]
    },
    {
      "name": "Micronesia",
      "cca2": "FM",
      "callingCode": "691",
      "altSpellings": [
        "FM",
        "Federated States of Micronesia"
      ]
    },
    {
      "name": "Moldova",
      "cca2": "MD",
      "callingCode": "373",
      "altSpellings": [
        "MD",
        "Republic of Moldova",
        "Republica Moldova"
      ]
    },
    {
      "name": "Monaco",
      "cca2": "MC",
      "callingCode": "377",
      "altSpellings": [
        "MC",
        "Principality of Monaco",
        "Principauté de Monaco"
      ]
    },
    {
      "name": "Mongolia",
      "cca2": "MN",
      "callingCode": "976",
      "altSpellings": "MN"
    },
    {
      "name": "Montenegro",
      "cca2": "ME",
      "callingCode": "382",
      "altSpellings": [
        "ME",
        "Crna Gora"
      ]
    },
    {
      "name": "Montserrat",
      "cca2": "MS",
      "callingCode": "1664",
      "altSpellings": "MS"
    },
    {
      "name": "Morocco",
      "cca2": "MA",
      "callingCode": "212",
      "altSpellings": [
        "MA",
        "Kingdom of Morocco",
        "Al-Mamlakah al-Maġribiyah"
      ]
    },
    {
      "name": "Mozambique",
      "cca2": "MZ",
      "callingCode": "258",
      "altSpellings": [
        "MZ",
        "Republic of Mozambique",
        "República de Moçambique"
      ]
    },
    {
      "name": "Myanmar",
      "cca2": "MM",
      "callingCode": "95",
      "altSpellings": [
        "MM",
        "Burma",
        "Republic of the Union of Myanmar",
        "Pyidaunzu Thanmăda Myăma Nainngandaw"
      ]
    },
    {
      "name": "Namibia",
      "cca2": "NA",
      "callingCode": "264",
      "altSpellings": [
        "NA",
        "Namibië",
        "Republic of Namibia"
      ]
    },
    {
      "name": "Nauru",
      "cca2": "NR",
      "callingCode": "674",
      "altSpellings": [
        "NR",
        "Naoero",
        "Pleasant Island",
        "Republic of Nauru",
        "Ripublik Naoero"
      ]
    },
    {
      "name": "Nepal",
      "cca2": "NP",
      "callingCode": "977",
      "altSpellings": [
        "NP",
        "Federal Democratic Republic of Nepal",
        "Loktāntrik Ganatantra Nepāl"
      ]
    },
    {
      "name": "Netherlands",
      "cca2": "NL",
      "callingCode": "31",
      "altSpellings": [
        "NL",
        "Holland",
        "Nederland"
      ]
    },
    {
      "name": "New Caledonia",
      "cca2": "NC",
      "callingCode": "687",
      "altSpellings": "NC"
    },
    {
      "name": "New Zealand",
      "cca2": "NZ",
      "callingCode": "64",
      "altSpellings": [
        "NZ",
        "Aotearoa"
      ]
    },
    {
      "name": "Nicaragua",
      "cca2": "NI",
      "callingCode": "505",
      "altSpellings": [
        "NI",
        "Republic of Nicaragua",
        "República de Nicaragua"
      ]
    },
    {
      "name": "Niger",
      "cca2": "NE",
      "callingCode": "227",
      "altSpellings": [
        "NE",
        "Nijar",
        "Republic of Niger",
        "République du Niger"
      ]
    },
    {
      "name": "Nigeria",
      "cca2": "NG",
      "callingCode": "234",
      "altSpellings": [
        "NG",
        "Nijeriya",
        "Naíjíríà",
        "Federal Republic of Nigeria"
      ]
    },
    {
      "name": "Niue",
      "cca2": "NU",
      "callingCode": "683",
      "altSpellings": "NU"
    },
    {
      "name": "Norfolk Island",
      "cca2": "NF",
      "callingCode": "672",
      "altSpellings": [
        "NF",
        "Territory of Norfolk Island",
        "Teratri of Norf'k Ailen"
      ]
    },
    {
      "name": "North Korea",
      "cca2": "KP",
      "callingCode": "850",
      "altSpellings": [
        "KP",
        "Democratic People's Republic of Korea",
        "조선민주주의인민공화국",
        "Chosŏn Minjujuŭi Inmin Konghwaguk"
      ]
    },
    {
      "name": "Northern Mariana Islands",
      "cca2": "MP",
      "callingCode": "1670",
      "altSpellings": [
        "MP",
        "Commonwealth of the Northern Mariana Islands",
        "Sankattan Siha Na Islas Mariånas"
      ]
    },
    {
      "name": "Norway",
      "cca2": "NO",
      "callingCode": "47",
      "altSpellings": [
        "NO",
        "Norge",
        "Noreg",
        "Kingdom of Norway",
        "Kongeriket Norge",
        "Kongeriket Noreg"
      ]
    },
    {
      "name": "Oman",
      "cca2": "OM",
      "callingCode": "968",
      "altSpellings": [
        "OM",
        "Sultanate of Oman",
        "Salṭanat ʻUmān"
      ]
    },
    {
      "name": "Pakistan",
      "cca2": "PK",
      "callingCode": "92",
      "altSpellings": [
        "PK",
        "Pākistān",
        "Islamic Republic of Pakistan",
        "Islāmī Jumhūriya'eh Pākistān"
      ]
    },
    {
      "name": "Palau",
      "cca2": "PW",
      "callingCode": "680",
      "altSpellings": [
        "PW",
        "Republic of Palau",
        "Beluu er a Belau"
      ]
    },
    {
      "name": "Palestine",
      "cca2": "PS",
      "callingCode": "970",
      "altSpellings": [
        "PS",
        "State of Palestine",
        "Dawlat Filasṭin"
      ]
    },
    {
      "name": "Panama",
      "cca2": "PA",
      "callingCode": "507",
      "altSpellings": [
        "PA",
        "Republic of Panama",
        "República de Panamá"
      ]
    },
    {
      "name": "Papua New Guinea",
      "cca2": "PG",
      "callingCode": "675",
      "altSpellings": [
        "PG",
        "Independent State of Papua New Guinea",
        "Independen Stet bilong Papua Niugini"
      ]
    },
    {
      "name": "Paraguay",
      "cca2": "PY",
      "callingCode": "595",
      "altSpellings": [
        "PY",
        "Republic of Paraguay",
        "República del Paraguay",
        "Tetã Paraguái"
      ]
    },
    {
      "name": "Peru",
      "cca2": "PE",
      "callingCode": "51",
      "altSpellings": [
        "PE",
        "Republic of Peru",
        " República del Perú"
      ]
    },
    {
      "name": "Philippines",
      "cca2": "PH",
      "callingCode": "63",
      "altSpellings": [
        "PH",
        "Republic of the Philippines",
        "Repúblika ng Pilipinas"
      ]
    },
    {
      "name": "Pitcairn Islands",
      "cca2": "PN",
      "callingCode": "64",
      "altSpellings": [
        "PN",
        "Pitcairn Henderson Ducie and Oeno Islands"
      ]
    },
    {
      "name": "Poland",
      "cca2": "PL",
      "callingCode": "48",
      "altSpellings": [
        "PL",
        "Republic of Poland",
        "Rzeczpospolita Polska"
      ]
    },
    {
      "name": "Portugal",
      "cca2": "PT",
      "callingCode": "351",
      "altSpellings": [
        "PT",
        "Portuguesa",
        "Portuguese Republic",
        "República Portuguesa"
      ]
    },
    {
      "name": "Puerto Rico",
      "cca2": "PR",
      "callingCode": [
        "1787",
        "1939"
      ],
      "altSpellings": [
        "PR",
        "Commonwealth of Puerto Rico",
        "Estado Libre Asociado de Puerto Rico"
      ]
    },
    {
      "name": "Qatar",
      "cca2": "QA",
      "callingCode": "974",
      "altSpellings": [
        "QA",
        "State of Qatar",
        "Dawlat Qaṭar"
      ]
    },
    {
      "name": "Republic of Kosovo",
      "cca2": "XK",
      "callingCode": [
        "377",
        "381",
        "386"
      ],
      "altSpellings": [
        "XK",
        "Република Косово"
      ]
    },
    {
      "name": "Réunion",
      "cca2": "RE",
      "callingCode": "262",
      "altSpellings": [
        "RE",
        "Reunion"
      ]
    },
    {
      "name": "Romania",
      "cca2": "RO",
      "callingCode": "40",
      "altSpellings": [
        "RO",
        "Rumania",
        "Roumania",
        "România"
      ]
    },
    {
      "name": "Russia",
      "cca2": "RU",
      "callingCode": "7",
      "altSpellings": [
        "RU",
        "Rossiya",
        "Russian Federation",
        "Российская Федерация",
        "Rossiyskaya Federatsiya"
      ]
    },
    {
      "name": "Rwanda",
      "cca2": "RW",
      "callingCode": "250",
      "altSpellings": [
        "RW",
        "Republic of Rwanda",
        "Repubulika y'u Rwanda",
        "République du Rwanda"
      ]
    },
    {
      "name": "Saint Barthélemy",
      "cca2": "BL",
      "callingCode": "590",
      "altSpellings": [
        "BL",
        "St. Barthelemy",
        "Collectivity of Saint Barthélemy",
        "Collectivité de Saint-Barthélemy"
      ]
    },
    {
      "name": "Saint Helena",
      "cca2": "SH",
      "callingCode": "290",
      "altSpellings": "SH"
    },
    {
      "name": "Saint Kitts and Nevis",
      "cca2": "KN",
      "callingCode": "1869",
      "altSpellings": [
        "KN",
        "Federation of Saint Christopher and Nevis"
      ]
    },
    {
      "name": "Saint Lucia",
      "cca2": "LC",
      "callingCode": "1758",
      "altSpellings": "LC"
    },
    {
      "name": "Saint Martin",
      "cca2": "MF",
      "callingCode": "590",
      "altSpellings": [
        "MF",
        "Collectivity of Saint Martin",
        "Collectivité de Saint-Martin"
      ]
    },
    {
      "name": "Saint Pierre and Miquelon",
      "cca2": "PM",
      "callingCode": "508",
      "altSpellings": [
        "PM",
        "Collectivité territoriale de Saint-Pierre-et-Miquelon"
      ]
    },
    {
      "name": "Saint Vincent and the Grenadines",
      "cca2": "VC",
      "callingCode": "1784",
      "altSpellings": "VC"
    },
    {
      "name": "Samoa",
      "cca2": "WS",
      "callingCode": "685",
      "altSpellings": [
        "WS",
        "Independent State of Samoa",
        "Malo Saʻoloto Tutoʻatasi o Sāmoa"
      ]
    },
    {
      "name": "San Marino",
      "cca2": "SM",
      "callingCode": "378",
      "altSpellings": [
        "SM",
        "Republic of San Marino",
        "Repubblica di San Marino"
      ]
    },
    {
      "name": "São Tomé and Príncipe",
      "cca2": "ST",
      "callingCode": "239",
      "altSpellings": [
        "ST",
        "Democratic Republic of São Tomé and Príncipe",
        "República Democrática de São Tomé e Príncipe"
      ]
    },
    {
      "name": "Saudi Arabia",
      "cca2": "SA",
      "callingCode": "966",
      "altSpellings": [
        "SA",
        "Kingdom of Saudi Arabia",
        "Al-Mamlakah al-‘Arabiyyah as-Su‘ūdiyyah"
      ]
    },
    {
      "name": "Senegal",
      "cca2": "SN",
      "callingCode": "221",
      "altSpellings": [
        "SN",
        "Republic of Senegal",
        "République du Sénégal"
      ]
    },
    {
      "name": "Serbia",
      "cca2": "RS",
      "callingCode": "381",
      "altSpellings": [
        "RS",
        "Srbija",
        "Republic of Serbia",
        "Република Србија",
        "Republika Srbija"
      ]
    },
    {
      "name": "Seychelles",
      "cca2": "SC",
      "callingCode": "248",
      "altSpellings": [
        "SC",
        "Republic of Seychelles",
        "Repiblik Sesel",
        "République des Seychelles"
      ]
    },
    {
      "name": "Sierra Leone",
      "cca2": "SL",
      "callingCode": "232",
      "altSpellings": [
        "SL",
        "Republic of Sierra Leone"
      ]
    },
    {
      "name": "Singapore",
      "cca2": "SG",
      "callingCode": "65",
      "altSpellings": [
        "SG",
        "Singapura",
        "Republik Singapura",
        "新加坡共和国"
      ]
    },
    {
      "name": "Sint Maarten",
      "cca2": "SX",
      "callingCode": "1721",
      "altSpellings": "SX"
    },
    {
      "name": "Slovakia",
      "cca2": "SK",
      "callingCode": "421",
      "altSpellings": [
        "SK",
        "Slovak Republic",
        "Slovenská republika"
      ]
    },
    {
      "name": "Slovenia",
      "cca2": "SI",
      "callingCode": "386",
      "altSpellings": [
        "SI",
        "Republic of Slovenia",
        "Republika Slovenija"
      ]
    },
    {
      "name": "Solomon Islands",
      "cca2": "SB",
      "callingCode": "677",
      "altSpellings": "SB"
    },
    {
      "name": "Somalia",
      "cca2": "SO",
      "callingCode": "252",
      "altSpellings": [
        "SO",
        "aṣ-Ṣūmāl",
        "Federal Republic of Somalia",
        "Jamhuuriyadda Federaalka Soomaaliya",
        "Jumhūriyyat aṣ-Ṣūmāl al-Fiderāliyya"
      ]
    },
    {
      "name": "South Africa",
      "cca2": "ZA",
      "callingCode": "27",
      "altSpellings": [
        "ZA",
        "RSA",
        "Suid-Afrika",
        "Republic of South Africa"
      ]
    },
    {
      "name": "South Georgia",
      "cca2": "GS",
      "callingCode": "500",
      "altSpellings": [
        "GS",
        "South Georgia and the South Sandwich Islands"
      ]
    },
    {
      "name": "South Korea",
      "cca2": "KR",
      "callingCode": "82",
      "altSpellings": [
        "KR",
        "Republic of Korea"
      ]
    },
    {
      "name": "South Sudan",
      "cca2": "SS",
      "callingCode": "211",
      "altSpellings": "SS"
    },
    {
      "name": "Spain",
      "cca2": "ES",
      "callingCode": "34",
      "altSpellings": [
        "ES",
        "Kingdom of Spain",
        "Reino de España"
      ]
    },
    {
      "name": "Sri Lanka",
      "cca2": "LK",
      "callingCode": "94",
      "altSpellings": [
        "LK",
        "ilaṅkai",
        "Democratic Socialist Republic of Sri Lanka"
      ]
    },
    {
      "name": "Sudan",
      "cca2": "SD",
      "callingCode": "249",
      "altSpellings": [
        "SD",
        "Republic of the Sudan",
        "Jumhūrīyat as-Sūdān"
      ]
    },
    {
      "name": "Suriname",
      "cca2": "SR",
      "callingCode": "597",
      "altSpellings": [
        "SR",
        "Sarnam",
        "Sranangron",
        "Republic of Suriname",
        "Republiek Suriname"
      ]
    },
    {
      "name": "Svalbard and Jan Mayen",
      "cca2": "SJ",
      "callingCode": "4779",
      "altSpellings": [
        "SJ",
        "Svalbard and Jan Mayen Islands"
      ]
    },
    {
      "name": "Swaziland",
      "cca2": "SZ",
      "callingCode": "268",
      "altSpellings": [
        "SZ",
        "weSwatini",
        "Swatini",
        "Ngwane",
        "Kingdom of Swaziland",
        "Umbuso waseSwatini"
      ]
    },
    {
      "name": "Sweden",
      "cca2": "SE",
      "callingCode": "46",
      "altSpellings": [
        "SE",
        "Kingdom of Sweden",
        "Konungariket Sverige"
      ]
    },
    {
      "name": "Switzerland",
      "cca2": "CH",
      "callingCode": "41",
      "altSpellings": [
        "CH",
        "Swiss Confederation",
        "Schweiz",
        "Suisse",
        "Svizzera",
        "Svizra"
      ]
    },
    {
      "name": "Syria",
      "cca2": "SY",
      "callingCode": "963",
      "altSpellings": [
        "SY",
        "Syrian Arab Republic",
        "Al-Jumhūrīyah Al-ʻArabīyah As-Sūrīyah"
      ]
    },
    {
      "name": "Taiwan",
      "cca2": "TW",
      "callingCode": "886",
      "altSpellings": [
        "TW",
        "Táiwān",
        "Republic of China",
        "中華民國",
        "Zhōnghuá Mínguó"
      ]
    },
    {
      "name": "Tajikistan",
      "cca2": "TJ",
      "callingCode": "992",
      "altSpellings": [
        "TJ",
        "Toçikiston",
        "Republic of Tajikistan",
        "Ҷумҳурии Тоҷикистон",
        "Çumhuriyi Toçikiston"
      ]
    },
    {
      "name": "Tanzania",
      "cca2": "TZ",
      "callingCode": "255",
      "altSpellings": [
        "TZ",
        "United Republic of Tanzania",
        "Jamhuri ya Muungano wa Tanzania"
      ]
    },
    {
      "name": "Thailand",
      "cca2": "TH",
      "callingCode": "66",
      "altSpellings": [
        "TH",
        "Prathet",
        "Thai",
        "Kingdom of Thailand",
        "ราชอาณาจักรไทย",
        "Ratcha Anachak Thai"
      ]
    },
    {
      "name": "Timor-Leste",
      "cca2": "TL",
      "callingCode": "670",
      "altSpellings": [
        "TL",
        "East Timor",
        "Democratic Republic of Timor-Leste",
        "República Democrática de Timor-Leste",
        "Repúblika Demokrátika Timór-Leste"
      ]
    },
    {
      "name": "Togo",
      "cca2": "TG",
      "callingCode": "228",
      "altSpellings": [
        "TG",
        "Togolese",
        "Togolese Republic",
        "République Togolaise"
      ]
    },
    {
      "name": "Tokelau",
      "cca2": "TK",
      "callingCode": "690",
      "altSpellings": "TK"
    },
    {
      "name": "Tonga",
      "cca2": "TO",
      "callingCode": "676",
      "altSpellings": "TO"
    },
    {
      "name": "Trinidad and Tobago",
      "cca2": "TT",
      "callingCode": "1868",
      "altSpellings": [
        "TT",
        "Republic of Trinidad and Tobago"
      ]
    },
    {
      "name": "Tunisia",
      "cca2": "TN",
      "callingCode": "216",
      "altSpellings": [
        "TN",
        "Republic of Tunisia",
        "al-Jumhūriyyah at-Tūnisiyyah"
      ]
    },
    {
      "name": "Turkey",
      "cca2": "TR",
      "callingCode": "90",
      "altSpellings": [
        "TR",
        "Turkiye",
        "Republic of Turkey",
        "Türkiye Cumhuriyeti"
      ]
    },
    {
      "name": "Turkmenistan",
      "cca2": "TM",
      "callingCode": "993",
      "altSpellings": "TM"
    },
    {
      "name": "Turks and Caicos Islands",
      "cca2": "TC",
      "callingCode": "1649",
      "altSpellings": "TC"
    },
    {
      "name": "Tuvalu",
      "cca2": "TV",
      "callingCode": "688",
      "altSpellings": "TV"
    },
    {
      "name": "Uganda",
      "cca2": "UG",
      "callingCode": "256",
      "altSpellings": [
        "UG",
        "Republic of Uganda",
        "Jamhuri ya Uganda"
      ]
    },
    {
      "name": "Ukraine",
      "cca2": "UA",
      "callingCode": "380",
      "altSpellings": [
        "UA",
        "Ukrayina"
      ]
    },
    {
      "name": "United Arab Emirates",
      "cca2": "AE",
      "callingCode": "971",
      "altSpellings": [
        "AE",
        "UAE"
      ]
    },
    {
      "name": "United Kingdom",
      "cca2": "GB",
      "callingCode": "44",
      "altSpellings": [
        "GB",
        "UK",
        "Great Britain"
      ]
    },
    {
      "name": "United States",
      "cca2": "US",
      "callingCode": "1",
      "altSpellings": [
        "US",
        "USA",
        "United States of America",
        "America"
      ]
    },
    {
      "name": "United States Minor Outlying Islands",
      "cca2": "UM",
      "callingCode": "",
      "altSpellings": "UM"
    },
    {
      "name": "United States Virgin Islands",
      "cca2": "VI",
      "callingCode": "1340",
      "altSpellings": "VI"
    },
    {
      "name": "Uruguay",
      "cca2": "UY",
      "callingCode": "598",
      "altSpellings": [
        "UY",
        "Oriental Republic of Uruguay",
        "República Oriental del Uruguay"
      ]
    },
    {
      "name": "Uzbekistan",
      "cca2": "UZ",
      "callingCode": "998",
      "altSpellings": [
        "UZ",
        "Republic of Uzbekistan",
        "O‘zbekiston Respublikasi",
        "Ўзбекистон Республикаси"
      ]
    },
    {
      "name": "Vanuatu",
      "cca2": "VU",
      "callingCode": "678",
      "altSpellings": [
        "VU",
        "Republic of Vanuatu",
        "Ripablik blong Vanuatu",
        "République de Vanuatu"
      ]
    },
    {
      "name": "Venezuela",
      "cca2": "VE",
      "callingCode": "58",
      "altSpellings": [
        "VE",
        "Bolivarian Republic of Venezuela",
        "República Bolivariana de Venezuela"
      ]
    },
    {
      "name": "Vietnam",
      "cca2": "VN",
      "callingCode": "84",
      "altSpellings": [
        "VN",
        "Socialist Republic of Vietnam",
        "Cộng hòa Xã hội chủ nghĩa Việt Nam"
      ]
    },
    {
      "name": "Wallis and Futuna",
      "cca2": "WF",
      "callingCode": "681",
      "altSpellings": [
        "WF",
        "Territory of the Wallis and Futuna Islands",
        "Territoire des îles Wallis et Futuna"
      ]
    },
    {
      "name": "Western Sahara",
      "cca2": "EH",
      "callingCode": "212",
      "altSpellings": [
        "EH",
        "Taneẓroft Tutrimt"
      ]
    },
    {
      "name": "Yemen",
      "cca2": "YE",
      "callingCode": "967",
      "altSpellings": [
        "YE",
        "Yemeni Republic",
        "al-Jumhūriyyah al-Yamaniyyah"
      ]
    },
    {
      "name": "Zambia",
      "cca2": "ZM",
      "callingCode": "260",
      "altSpellings": [
        "ZM",
        "Republic of Zambia"
      ]
    },
    {
      "name": "Zimbabwe",
      "cca2": "ZW",
      "callingCode": "263",
      "altSpellings": [
        "ZW",
        "Republic of Zimbabwe"
      ]
    }
  ];
  root = this;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Countries;
  } 

  if (typeof root !== 'undefined') {
    root.Countries = Countries;
  }
})();

// ---
// generated by coffee-script 1.9.0
});

;require.register("widget/lib/fuzzyset", function(exports, require, module) {
(function() {

var FuzzySet = function(arr, useLevenshtein, gramSizeLower, gramSizeUpper) {
    var fuzzyset = {
        version: '0.0.1'
    };

    // default options
    arr = arr || [];
    fuzzyset.gramSizeLower = gramSizeLower || 2;
    fuzzyset.gramSizeUpper = gramSizeUpper || 3;
    fuzzyset.useLevenshtein = useLevenshtein || true;

    // define all the object functions and attributes
    fuzzyset.exactSet = {};
    fuzzyset.matchDict = {};
    fuzzyset.items = {};

    // helper functions
    var levenshtein = function(str1, str2) {
        var current = [], prev, value;

        for (var i = 0; i <= str2.length; i++)
            for (var j = 0; j <= str1.length; j++) {
            if (i && j)
                if (str1.charAt(j - 1) === str2.charAt(i - 1))
                value = prev;
                else
                value = Math.min(current[j], current[j - 1], prev) + 1;
            else
                value = i + j;

            prev = current[j];
            current[j] = value;
            }

        return current.pop();
    };

    // return an edit distance from 0 to 1
    var _distance = function(str1, str2) {
        if (str1 === null && str2 === null) throw 'Trying to compare two null values';
        if (str1 === null || str2 === null) return 0;
        str1 = String(str1); str2 = String(str2);

        var distance = levenshtein(str1, str2);
        if (str1.length > str2.length) {
            return 1 - distance / str1.length;
        } else {
            return 1 - distance / str2.length;
        }
    };
    var _nonWordRe = /[^\w, ]+/;

    var _iterateGrams = function(value, gramSize) {
        gramSize = gramSize || 2;
        var simplified = '-' + value.toLowerCase().replace(_nonWordRe, '') + '-',
            lenDiff = gramSize - simplified.length,
            results = [];
        if (lenDiff > 0) {
            for (var i = 0; i < lenDiff; ++i) {
                value += '-';
            }
        }
        for (var i = 0; i < simplified.length - gramSize + 1; ++i) {
            results.push(simplified.slice(i, i + gramSize));
        }
        return results;
    };

    var _gramCounter = function(value, gramSize) {
        // return an object where key=gram, value=number of occurrences
        gramSize = gramSize || 2;
        var result = {},
            grams = _iterateGrams(value, gramSize),
            i = 0;
        for (i; i < grams.length; ++i) {
            if (grams[i] in result) {
                result[grams[i]] += 1;
            } else {
                result[grams[i]] = 1;
            }
        }
        return result;
    };

    // the main functions
    fuzzyset.get = function(value, defaultValue) {
        // check for value in set, returning defaultValue or null if none found
        var result = this._get(value);
        if (!result && defaultValue) {
            return defaultValue;
        }
        return result;
    };

    fuzzyset._get = function(value) {
        var normalizedValue = this._normalizeStr(value),
            result = this.exactSet[normalizedValue];
        if (result) {
            return [[1, result]];
        }

        var results = [];
        // start with high gram size and if there are no results, go to lower gram sizes
        for (var gramSize = this.gramSizeUpper; gramSize >= this.gramSizeLower; --gramSize) {
            results = this.__get(value, gramSize);
            if (results) {
                return results;
            }
        }
        return null;
    };

    fuzzyset.__get = function(value, gramSize) {
        var normalizedValue = this._normalizeStr(value),
            matches = {},
            gramCounts = _gramCounter(normalizedValue, gramSize),
            items = this.items[gramSize],
            sumOfSquareGramCounts = 0,
            gram,
            gramCount,
            i,
            index,
            otherGramCount;

        for (gram in gramCounts) {
            gramCount = gramCounts[gram];
            sumOfSquareGramCounts += Math.pow(gramCount, 2);
            if (gram in this.matchDict) {
                for (i = 0; i < this.matchDict[gram].length; ++i) {
                    index = this.matchDict[gram][i][0];
                    otherGramCount = this.matchDict[gram][i][1];
                    if (index in matches) {
                        matches[index] += gramCount * otherGramCount;
                    } else {
                        matches[index] = gramCount * otherGramCount;
                    }
                }
            }
        }

        function isEmptyObject(obj) {
            for(var prop in obj) {
                if(obj.hasOwnProperty(prop))
                    return false;
            }
            return true;
        }

        if (isEmptyObject(matches)) {
            return null;
        }

        var vectorNormal = Math.sqrt(sumOfSquareGramCounts),
            results = [],
            matchScore;
        // build a results list of [score, str]
        for (var matchIndex in matches) {
            matchScore = matches[matchIndex];
            results.push([matchScore / (vectorNormal * items[matchIndex][0]), items[matchIndex][1]]);
        }
        var sortDescending = function(a, b) {
            if (a[0] < b[0]) {
                return 1;
            } else if (a[0] > b[0]) {
                return -1;
            } else {
                return 0;
            }
        };
        results.sort(sortDescending);
        if (this.useLevenshtein) {
            var newResults = [],
                endIndex = Math.min(50, results.length);
            // truncate somewhat arbitrarily to 50
            for (var i = 0; i < endIndex; ++i) {
                newResults.push([_distance(results[i][1], normalizedValue), results[i][1]]);
            }
            results = newResults;
            results.sort(sortDescending);
        }
        var newResults = [];
        for (var i = 0; i < results.length; ++i) {
            if (results[i][0] == results[0][0]) {
                newResults.push([results[i][0], this.exactSet[results[i][1]]]);
            }
        }
        return newResults;
    };

    fuzzyset.add = function(value) {
        var normalizedValue = this._normalizeStr(value);
        if (normalizedValue in this.exactSet) {
            return false;
        }

        var i = this.gramSizeLower;
        for (i; i < this.gramSizeUpper + 1; ++i) {
            this._add(value, i);
        }
    };

    fuzzyset._add = function(value, gramSize) {
        var normalizedValue = this._normalizeStr(value),
            items = this.items[gramSize] || [],
            index = items.length;

        items.push(0);
        var gramCounts = _gramCounter(normalizedValue, gramSize),
            sumOfSquareGramCounts = 0,
            gram, gramCount;
        for (gram in gramCounts) {
            gramCount = gramCounts[gram];
            sumOfSquareGramCounts += Math.pow(gramCount, 2);
            if (gram in this.matchDict) {
                this.matchDict[gram].push([index, gramCount]);
            } else {
                this.matchDict[gram] = [[index, gramCount]];
            }
        }
        var vectorNormal = Math.sqrt(sumOfSquareGramCounts);
        items[index] = [vectorNormal, normalizedValue];
        this.items[gramSize] = items;
        this.exactSet[normalizedValue] = value;
    };

    fuzzyset._normalizeStr = function(str) {
        if (Object.prototype.toString.call(str) !== '[object String]') throw 'Must use a string as argument to FuzzySet functions';
        return str.toLowerCase();
    };

    // return length of items in set
    fuzzyset.length = function() {
        var count = 0,
            prop;
        for (prop in this.exactSet) {
            if (this.exactSet.hasOwnProperty(prop)) {
                count += 1;
            }
        }
        return count;
    };

    // return is set is empty
    fuzzyset.isEmpty = function() {
        for (var prop in this.exactSet) {
            if (this.exactSet.hasOwnProperty(prop)) {
                return false;
            }
        }
        return true;
    };

    // return list of values loaded into set
    fuzzyset.values = function() {
        var values = [],
            prop;
        for (prop in this.exactSet) {
            if (this.exactSet.hasOwnProperty(prop)) {
                values.push(this.exactSet[prop]);
            }
        }
        return values;
    };


    // initialization
    var i = fuzzyset.gramSizeLower;
    for (i; i < fuzzyset.gramSizeUpper + 1; ++i) {
        fuzzyset.items[i] = [];
    }
    // add all the items to the set
    for (i = 0; i < arr.length; ++i) {
        fuzzyset.add(arr[i]);
    }

    return fuzzyset;
};

var root = this;
// Export the fuzzyset object for **CommonJS**, with backwards-compatibility
// for the old `require()` API. If we're not in CommonJS, add `_` to the
// global object.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FuzzySet;
    
}

if (typeof root !== 'undefined') {
    root.FuzzySet = FuzzySet;
}

})();
});

require.register("widget/lib/isvisible", function(exports, require, module) {
(function() {

  /**
  * Author: Jason Farrell
  * Author URI: http://useallfive.com/
  *
  * Description: Checks if a DOM element is truly visible.
  * Package URL: https://github.com/UseAllFive/true-visibility
  */

  /*
  * https://secure2.store.apple.com/us/checkout is too good for Element.prototype
  */
  if(typeof window.Element.prototype === 'undefined')
  {
    return;
  }

  window.Element.prototype.isVisible = function() {

    'use strict';

    /**
    * Checks if a DOM element is visible. Takes into
    * consideration its parents and overflow.
    *
    * @param (el)      the DOM element to check if is visible
    *
    * These params are optional that are sent in recursively,
    * you typically won't use these:
    *
    * @param (t)       Top corner position number
    * @param (r)       Right corner position number
    * @param (b)       Bottom corner position number
    * @param (l)       Left corner position number
    * @param (w)       Element width number
    * @param (h)       Element height number
    */
    function _isVisible(el, t, r, b, l, w, h) {
      var p = el.parentNode, VISIBLE_PADDING = 2;

      // Anders 22/06/2015 - if element has been removed from the parent
      if ( ! p ) {
        return false;
      }

      // Stu 2/6/2015 - this does not work for iframes
      // E.g. http://www.millingtonlockwood.com/contact.html
      // if ( !_elementInDocument(el) ) {
        //     return false;
        // }

        //-- Return true for document node
        if ( 9 === p.nodeType ) {
          return true;
        }

        //-- Return false if our element is invisible
        if (
          '0' === _getStyle(el, 'opacity') ||
          'none' === _getStyle(el, 'display') ||
          'hidden' === _getStyle(el, 'visibility')
        ) {
          return false;
        }

        if (
          'undefined' === typeof(t) ||
          'undefined' === typeof(r) ||
          'undefined' === typeof(b) ||
          'undefined' === typeof(l) ||
          'undefined' === typeof(w) ||
          'undefined' === typeof(h)
        ) {
          t = el.offsetTop;
          l = el.offsetLeft;
          b = t + el.offsetHeight;
          r = l + el.offsetWidth;
          w = el.offsetWidth;
          h = el.offsetHeight;
        }
        //-- If we have a parent, let's continue:
        if ( p ) {

          // Stu 27/3/2015
          // Ticketek payment form does not resolve the offsets correctly
          // Bailing this part of ths is visible checks

          //-- Check if the parent can hide its children.
          // if ( ('hidden' === _getStyle(p, 'overflow') || 'scroll' === _getStyle(p, 'overflow')) ) {
            //     //-- Only check if the offset is different for the parent
            //     if (
              //         //-- If the target element is to the right of the parent elm
              //         l + VISIBLE_PADDING > p.offsetWidth + p.scrollLeft ||
              //         //-- If the target element is to the left of the parent elm
              //         l + w - VISIBLE_PADDING < p.scrollLeft ||
              //         //-- If the target element is under the parent elm
              //         t + VISIBLE_PADDING > p.offsetHeight + p.scrollTop ||
              //         //-- If the target element is above the parent elm
              //         t + h - VISIBLE_PADDING < p.scrollTop
//     ) {
              //         //-- Our target element is out of bounds:
              //         console.log("Element is out of bounds");
              //         console.log("To the right", l + VISIBLE_PADDING > p.offsetWidth + p.scrollLeft);
              //         console.log("To the left", l + w - VISIBLE_PADDING < p.scrollLeft);
              //         console.log("Underneath", t + VISIBLE_PADDING > p.offsetHeight + p.scrollTop);
              //         console.log("Above", t + h - VISIBLE_PADDING < p.scrollTop);
              //         return false;
              //     }
              // }
              //-- Add the offset parent's left/top coords to our element's offset:
              if ( el.offsetParent === p ) {
                l += p.offsetLeft;
                t += p.offsetTop;
              }
              //-- Let's recursively check upwards:
              return _isVisible(p, t, r, b, l, w, h);
        }
        return true;
    }

    //-- Cross browser method to get style properties:
    function _getStyle(el, property) {
      if ( window.getComputedStyle ) {
        return document.defaultView.getComputedStyle(el,null)[property];
      }
      if ( el.currentStyle ) {
        return el.currentStyle[property];
      }
    }

    function _elementInDocument(element) {
      while (element = element.parentNode) {
        if (element == document) {
          return true;
        }
      }
      return false;
    }

    return _isVisible(this);

  };

})();

});

require.register("widget/lib/jquery", function(exports, require, module) {
/*!
 * jQuery JavaScript Library v3.0.0-pre -ajax,-ajax/jsonp,-ajax/load,-ajax/parseJSON,-ajax/parseXML,-ajax/script,-ajax/var/location,-ajax/var/nonce,-ajax/var/rquery,-ajax/xhr,-manipulation/_evalUrl,-event/ajax,-css,-css/addGetHookIf,-css/adjustCSS,-css/curCSS,-css/hiddenVisibleSelectors,-css/showHide,-css/support,-css/var/cssExpand,-css/var/getStyles,-css/var/isHidden,-css/var/rmargin,-css/var/rnumnonpx,-css/var/swap,-effects,-effects/Tween,-effects/animatedSelector,-dimensions,-offset,-deprecated,-wrap
 * http://jquery.com/
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2015-08-07T05:32Z
 */

(function( global, factory ) {

	if ( typeof module === "object" && typeof module.exports === "object" ) {
		// For CommonJS and CommonJS-like environments where a proper `window`
		// is present, execute the factory and get jQuery.
		// For environments that do not have a `window` with a `document`
		// (such as Node.js), expose a factory as module.exports.
		// This accentuates the need for the creation of a real `window`.
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info.
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
}(typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Support: Firefox 18+
// Can't be in strict mode, several libs including ASP.NET trace
// the stack via arguments.caller.callee and Firefox dies if
// you try to trace through "use strict" call chains. (#13335)
//"use strict";
var arr = [];

var document = window.document;

var slice = arr.slice;

var concat = arr.concat;

var push = arr.push;

var indexOf = arr.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var support = {};



var
	version = "3.0.0-pre -ajax,-ajax/jsonp,-ajax/load,-ajax/parseJSON,-ajax/parseXML,-ajax/script,-ajax/var/location,-ajax/var/nonce,-ajax/var/rquery,-ajax/xhr,-manipulation/_evalUrl,-event/ajax,-css,-css/addGetHookIf,-css/adjustCSS,-css/curCSS,-css/hiddenVisibleSelectors,-css/showHide,-css/support,-css/var/cssExpand,-css/var/getStyles,-css/var/isHidden,-css/var/rmargin,-css/var/rnumnonpx,-css/var/swap,-effects,-effects/Tween,-effects/animatedSelector,-dimensions,-offset,-deprecated,-wrap",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {
		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	},

	// Support: Android<4.1
	// Make sure we trim BOM and NBSP
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([a-z])/g,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return letter.toUpperCase();
	};

jQuery.fn = jQuery.prototype = {
	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {
		return num != null ?

			// Return just the one element from the set
			( num < 0 ? this[ num + this.length ] : this[ num ] ) :

			// Return all the elements in a clean array
			slice.call( this );
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	each: function( callback ) {
		return jQuery.each( this, callback );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map(this, function( elem, i ) {
			return callback.call( elem, i, elem );
		}));
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[j] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor(null);
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: arr.sort,
	splice: arr.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// Skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// Extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) ||
					(copyIsArray = jQuery.isArray(copy)) ) ) {

					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend({
	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	isFunction: function( obj ) {
		return jQuery.type(obj) === "function";
	},

	isArray: Array.isArray,

	isWindow: function( obj ) {
		return obj != null && obj === obj.window;
	},

	isNumeric: function( obj ) {
		// parseFloat NaNs numeric-cast false positives (null|true|false|"")
		// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
		// subtraction forces infinities to NaN
		// adding 1 corrects loss of precision from parseFloat (#15100)
		return !jQuery.isArray( obj ) && (obj - parseFloat( obj ) + 1) >= 0;
	},

	isPlainObject: function( obj ) {
		// Not plain objects:
		// - Any object or value whose internal [[Class]] property is not "[object Object]"
		// - DOM nodes
		// - window
		if ( jQuery.type( obj ) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
			return false;
		}

		if ( obj.constructor &&
				!hasOwn.call( obj.constructor.prototype, "isPrototypeOf" ) ) {
			return false;
		}

		// If the function hasn't returned already, we're confident that
		// |obj| is a plain object, created by {} or constructed with new Object
		return true;
	},

	isEmptyObject: function( obj ) {
		var name;
		for ( name in obj ) {
			return false;
		}
		return true;
	},

	type: function( obj ) {
		if ( obj == null ) {
			return obj + "";
		}
		// Support: Android<4.0 (functionish RegExp)
		return typeof obj === "object" || typeof obj === "function" ?
			class2type[ toString.call(obj) ] || "object" :
			typeof obj;
	},

	// Evaluates a script in a global context
	globalEval: function( code ) {
		var script = document.createElement( "script" );

		script.text = code;
		document.head.appendChild( script ).parentNode.removeChild( script );
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Support: IE9-11+
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
	},

	each: function( obj, callback ) {
		var i = 0,
			length = obj.length,
			isArray = isArraylike( obj );

		if ( isArray ) {
			for ( ; i < length; i++ ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		} else {
			for ( i in obj ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		}

		return obj;
	},

	// Support: Android<4.1
	trim: function( text ) {
		return text == null ?
			"" :
			( text + "" ).replace( rtrim, "" );
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArraylike( Object(arr) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
					[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : indexOf.call( arr, elem, i );
	},

	// Support: Android<4.1, PhantomJS<2
	// push.apply(_, arraylike) throws on ancient WebKit
	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		for ( ; j < len; j++ ) {
			first[ i++ ] = second[ j ];
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var value,
			i = 0,
			length = elems.length,
			isArray = isArraylike( elems ),
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArray ) {
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var tmp, args, proxy;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || jQuery.guid++;

		return proxy;
	},

	now: Date.now,

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
});

// JSHint would error on this code due to the Symbol not being defined in ES5.
// Defining this global in .jshintrc would create a danger of using the global
// unguarded in another place, it seems safer to just disable JSHint for these
// three lines.
/* jshint ignore: start */
if ( typeof Symbol === "function" ) {
	jQuery.fn[ Symbol.iterator ] = arr[ Symbol.iterator ];
}
/* jshint ignore: end */

// Populate the class2type map
jQuery.each("Boolean Number String Function Array Date RegExp Object Error".split(" "),
function(i, name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

function isArraylike( obj ) {

	// Support: iOS 8.2 (not reproducible in simulator)
	// `in` check used to prevent JIT error (gh-2145)
	// hasOwn isn't used here due to false negatives
	// regarding Nodelist length in IE
	var length = "length" in obj && obj.length,
		type = jQuery.type( obj );

	if ( type === "function" || jQuery.isWindow( obj ) ) {
		return false;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v2.2.0
 * http://sizzlejs.com/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2015-04-10
 */
(function( window ) {

var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + 1 * new Date(),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// General-purpose constants
	MAX_NEGATIVE = 1 << 31,

	// Instance methods
	hasOwn = ({}).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	push_native = arr.push,
	push = arr.push,
	slice = arr.slice,
	// Use a stripped-down indexOf as it's faster than native
	// http://jsperf.com/thor-indexof-vs-for/5
	indexOf = function( list, elem ) {
		var i = 0,
			len = list.length;
		for ( ; i < len; i++ ) {
			if ( list[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",

	// http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +
		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +
		// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
		"*\\]",

	pseudos = ":(" + identifier + ")(?:\\((" +
		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rwhitespace = new RegExp( whitespace + "+", "g" ),
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

	rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + identifier + ")" ),
		"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
		"TAG": new RegExp( "^(" + identifier + "|[*])" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
			whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,
	rescape = /'|\\/g,

	// CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
	funescape = function( _, escaped, escapedWhitespace ) {
		var high = "0x" + escaped - 0x10000;
		// NaN means non-codepoint
		// Support: Firefox<24
		// Workaround erroneous numeric interpretation of +"0x"
		return high !== high || escapedWhitespace ?
			escaped :
			high < 0 ?
				// BMP codepoint
				String.fromCharCode( high + 0x10000 ) :
				// Supplemental Plane codepoint (surrogate pair)
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	},

	// Used for iframes
	// See setDocument()
	// Removing the function wrapper causes a "Permission Denied"
	// error in IE
	unloadHandler = function() {
		setDocument();
	};

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		(arr = slice.call( preferredDoc.childNodes )),
		preferredDoc.childNodes
	);
	// Support: Android<4.0
	// Detect silently failing push.apply
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			push_native.apply( target, slice.call(els) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;
			// Can't trust NodeList.length
			while ( (target[j++] = els[i++]) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var m, i, elem, nid, match, groups, newSelector,
		newContext = context && context.ownerDocument,

		// nodeType defaults to 9, since context defaults to document
		nodeType = context ? context.nodeType : 9;

	results = results || [];

	// Return early from calls with invalid selector or context
	if ( typeof selector !== "string" || !selector ||
		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

		return results;
	}

	// Try to shortcut find operations (as opposed to filters) in HTML documents
	if ( !seed ) {

		if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
			setDocument( context );
		}
		context = context || document;

		if ( documentIsHTML ) {

			// If the selector is sufficiently simple, try using a "get*By*" DOM method
			// (excepting DocumentFragment context, where the methods don't exist)
			if ( nodeType !== 11 && (match = rquickExpr.exec( selector )) ) {

				// ID selector
				if ( (m = match[1]) ) {

					// Document context
					if ( nodeType === 9 ) {
						if ( (elem = context.getElementById( m )) ) {

							// Support: IE, Opera, Webkit
							// TODO: identify versions
							// getElementById can match elements by name instead of ID
							if ( elem.id === m ) {
								results.push( elem );
								return results;
							}
						} else {
							return results;
						}

					// Element context
					} else {

						// Support: IE, Opera, Webkit
						// TODO: identify versions
						// getElementById can match elements by name instead of ID
						if ( newContext && (elem = newContext.getElementById( m )) &&
							contains( context, elem ) &&
							elem.id === m ) {

							results.push( elem );
							return results;
						}
					}

				// Type selector
				} else if ( match[2] ) {
					push.apply( results, context.getElementsByTagName( selector ) );
					return results;

				// Class selector
				} else if ( (m = match[3]) && support.getElementsByClassName &&
					context.getElementsByClassName ) {

					push.apply( results, context.getElementsByClassName( m ) );
					return results;
				}
			}

			// Take advantage of querySelectorAll
			if ( support.qsa &&
				!compilerCache[ selector + " " ] &&
				(!rbuggyQSA || !rbuggyQSA.test( selector )) ) {

				if ( nodeType !== 1 ) {
					newContext = context;
					newSelector = selector;

				// qSA looks outside Element context, which is not what we want
				// Thanks to Andrew Dupont for this workaround technique
				// Support: IE <=8
				// Exclude object elements
				} else if ( context.nodeName.toLowerCase() !== "object" ) {

					// Capture the context ID, setting it first if necessary
					if ( (nid = context.getAttribute( "id" )) ) {
						nid = nid.replace( rescape, "\\$&" );
					} else {
						context.setAttribute( "id", (nid = expando) );
					}

					// Prefix every selector in the list
					groups = tokenize( selector );
					i = groups.length;
					while ( i-- ) {
						groups[i] = "[id='" + nid + "'] " + toSelector( groups[i] );
					}
					newSelector = groups.join( "," );

					// Expand context for sibling selectors
					newContext = rsibling.test( selector ) && testContext( context.parentNode ) ||
						context;
				}

				if ( newSelector ) {
					try {
						push.apply( results,
							newContext.querySelectorAll( newSelector )
						);
						return results;
					} catch ( qsaError ) {
					} finally {
						if ( nid === expando ) {
							context.removeAttribute( "id" );
						}
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {function(string, object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {
		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {
			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return (cache[ key + " " ] = value);
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created div and expects a boolean result
 */
function assert( fn ) {
	var div = document.createElement("div");

	try {
		return !!fn( div );
	} catch (e) {
		return false;
	} finally {
		// Remove from its parent by default
		if ( div.parentNode ) {
			div.parentNode.removeChild( div );
		}
		// release memory in IE
		div = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split("|"),
		i = attrs.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[i] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			( ~b.sourceIndex || MAX_NEGATIVE ) -
			( ~a.sourceIndex || MAX_NEGATIVE );

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( (cur = cur.nextSibling) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== "undefined" && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare, parent,
		doc = node ? node.ownerDocument || node : preferredDoc;

	// Return early if doc is invalid or already selected
	if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Update global variables
	document = doc;
	docElem = document.documentElement;
	documentIsHTML = !isXML( document );

	// Support: IE 9 - 11
	// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
	// Limit the fix to IE with document.documentMode and IE >=9 with document.defaultView
	if ( document.documentMode && (parent = document.defaultView) && parent.top !== parent ) {
		// Support: IE 11
		if ( parent.addEventListener ) {
			parent.addEventListener( "unload", unloadHandler, false );

		// Support: IE 9 - 10 only
		} else if ( parent.attachEvent ) {
			parent.attachEvent( "onunload", unloadHandler );
		}
	}

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties
	// (excepting IE8 booleans)
	support.attributes = assert(function( div ) {
		div.className = "i";
		return !div.getAttribute("className");
	});

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert(function( div ) {
		div.appendChild( document.createComment("") );
		return !div.getElementsByTagName("*").length;
	});

	// Support: IE<9
	support.getElementsByClassName = rnative.test( document.getElementsByClassName );

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert(function( div ) {
		docElem.appendChild( div ).id = expando;
		return !document.getElementsByName || !document.getElementsByName( expando ).length;
	});

	// ID find and filter
	if ( support.getById ) {
		Expr.find["ID"] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var m = context.getElementById( id );
				return m ? [ m ] : [];
			}
		};
		Expr.filter["ID"] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute("id") === attrId;
			};
		};
	} else {
		// Support: IE6/7
		// getElementById is not reliable as a find shortcut
		delete Expr.find["ID"];

		Expr.filter["ID"] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== "undefined" &&
					elem.getAttributeNode("id");
				return node && node.value === attrId;
			};
		};
	}

	// Tag
	Expr.find["TAG"] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( tag );

			// DocumentFragment nodes don't have gEBTN
			} else if ( support.qsa ) {
				return context.querySelectorAll( tag );
			}
		} :

		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,
				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( (elem = results[i++]) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== "undefined" && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See http://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( (support.qsa = rnative.test( document.querySelectorAll )) ) {
		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( div ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// http://bugs.jquery.com/ticket/12359
			docElem.appendChild( div ).innerHTML = "<a id='" + expando + "'></a>" +
				"<select id='" + expando + "-\r\\' msallowcapture=''>" +
				"<option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// http://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( div.querySelectorAll("[msallowcapture^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !div.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
			if ( !div.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
				rbuggyQSA.push("~=");
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}

			// Support: Safari 8+, iOS 8+
			// https://bugs.webkit.org/show_bug.cgi?id=136851
			// In-page `selector#id sibing-combinator selector` fails
			if ( !div.querySelectorAll( "a#" + expando + "+*" ).length ) {
				rbuggyQSA.push(".#.+[+~]");
			}
		});

		assert(function( div ) {
			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = document.createElement("input");
			input.setAttribute( "type", "hidden" );
			div.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( div.querySelectorAll("[name=d]").length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( !div.querySelectorAll(":enabled").length ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Opera 10-11 does not throw on post-comma invalid pseudos
			div.querySelectorAll("*,:x");
			rbuggyQSA.push(",.*:");
		});
	}

	if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector) )) ) {

		assert(function( div ) {
			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( div, "div" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( div, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		});
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully self-exclusive
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			));
		} :
		function( a, b ) {
			if ( b ) {
				while ( (b = b.parentNode) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

			// Choose the first element that is related to our preferred document
			if ( a === document || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
				return -1;
			}
			if ( b === document || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {
		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {
			return a === document ? -1 :
				b === document ? 1 :
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( (cur = cur.parentNode) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( (cur = cur.parentNode) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[i] === bp[i] ) {
			i++;
		}

		return i ?
			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[i], bp[i] ) :

			// Otherwise nodes in our document sort first
			ap[i] === preferredDoc ? -1 :
			bp[i] === preferredDoc ? 1 :
			0;
	};

	return document;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	// Make sure that attribute selectors are quoted
	expr = expr.replace( rattributeQuotes, "='$1']" );

	if ( support.matchesSelector && documentIsHTML &&
		!compilerCache[ expr + " " ] &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||
					// As well, disconnected nodes are said to be in a document
					// fragment in IE 9
					elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch (e) {}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
	// Set document vars if needed
	if ( ( context.ownerDocument || context ) !== document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
	// Set document vars if needed
	if ( ( elem.ownerDocument || elem ) !== document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],
		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			(val = elem.getAttributeNode(name)) && val.specified ?
				val.value :
				null;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( (elem = results[i++]) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {
		// If no nodeType, this is expected to be an array
		while ( (node = elem[i++]) ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {
			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}
	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1].slice( 0, 3 ) === "nth" ) {
				// nth-* requires argument
				if ( !match[3] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
				match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

			// other types prohibit arguments
			} else if ( match[3] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[6] && match[2];

			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[3] ) {
				match[2] = match[4] || match[5] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&
				// Get excess from tokenize (recursively)
				(excess = tokenize( unquoted, true )) &&
				// advance to the next closing parenthesis
				(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

				// excess is a negative index
				match[0] = match[0].slice( 0, excess );
				match[2] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() { return true; } :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
				classCache( className, function( elem ) {
					return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "" );
				});
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, what, argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, context, xml ) {
					var cache, uniqueCache, outerCache, node, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType,
						diff = false;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( (node = node[ dir ]) ) {
									if ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) {

										return false;
									}
								}
								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {

							// Seek `elem` from a previously-cached index

							// ...in a gzip-friendly way
							node = parent;
							outerCache = node[ expando ] || (node[ expando ] = {});

							// Support: IE <9 only
							// Defend against cloned attroperties (jQuery gh-1709)
							uniqueCache = outerCache[ node.uniqueID ] ||
								(outerCache[ node.uniqueID ] = {});

							cache = uniqueCache[ type ] || [];
							nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
							diff = nodeIndex && cache[ 2 ];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( (node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								(diff = nodeIndex = 0) || start.pop()) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									uniqueCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						} else {
							// Use previously-cached element index if available
							if ( useCache ) {
								// ...in a gzip-friendly way
								node = elem;
								outerCache = node[ expando ] || (node[ expando ] = {});

								// Support: IE <9 only
								// Defend against cloned attroperties (jQuery gh-1709)
								uniqueCache = outerCache[ node.uniqueID ] ||
									(outerCache[ node.uniqueID ] = {});

								cache = uniqueCache[ type ] || [];
								nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
								diff = nodeIndex;
							}

							// xml :nth-child(...)
							// or :nth-last-child(...) or :nth(-last)?-of-type(...)
							if ( diff === false ) {
								// Use the same loop as above to seek `elem` from the start
								while ( (node = ++nodeIndex && node && node[ dir ] ||
									(diff = nodeIndex = 0) || start.pop()) ) {

									if ( ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) &&
										++diff ) {

										// Cache the index of each encountered element
										if ( useCache ) {
											outerCache = node[ expando ] || (node[ expando ] = {});

											// Support: IE <9 only
											// Defend against cloned attroperties (jQuery gh-1709)
											uniqueCache = outerCache[ node.uniqueID ] ||
												(outerCache[ node.uniqueID ] = {});

											uniqueCache[ type ] = [ dirruns, diff ];
										}

										if ( node === elem ) {
											break;
										}
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		// Potentially complex pseudos
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					// Don't keep the element (issue #299)
					input[0] = null;
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			text = text.replace( runescape, funescape );
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {
			// lang value must be a valid identifier
			if ( !ridentifier.test(lang || "") ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( (elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
				return false;
			};
		}),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
		},

		// Boolean properties
		"enabled": function( elem ) {
			return elem.disabled === false;
		},

		"disabled": function( elem ) {
			return elem.disabled === true;
		},

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo(function() {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[0].length ) || soFar;
			}
			groups.push( (tokens = []) );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			matched = match.shift();
			tokens.push({
				value: matched,
				// Cast descendant combinators to space
				type: match[0].replace( rtrim, " " )
			});
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				(match = preFilters[ type ]( match ))) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					type: type,
					matches: match
				});
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[i].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		checkNonElements = base && dir === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, uniqueCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
			if ( xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || (elem[ expando ] = {});

						// Support: IE <9 only
						// Defend against cloned attroperties (jQuery gh-1709)
						uniqueCache = outerCache[ elem.uniqueID ] || (outerCache[ elem.uniqueID ] = {});

						if ( (oldCache = uniqueCache[ dir ]) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return (newCache[ 2 ] = oldCache[ 2 ]);
						} else {
							// Reuse newcache so results back-propagate to previous elements
							uniqueCache[ dir ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
								return true;
							}
						}
					}
				}
			}
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( (elem = temp[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {
					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) ) {
							// Restore matcherIn since elem is not yet a final match
							temp.push( (matcherIn[i] = elem) );
						}
					}
					postFinder( null, (matcherOut = []), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( (elem = matcherOut[i]) &&
						(temp = postFinder ? indexOf( seed, elem ) : preMap[i]) > -1 ) {

						seed[temp] = !(results[temp] = elem);
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
			// Avoid hanging onto element (issue #299)
			checkContext = null;
			return ret;
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
		} else {
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(
						// If the preceding token was a descendant combinator, insert an implicit any-element `*`
						tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,
				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
				len = elems.length;

			if ( outermost ) {
				outermostContext = context === document || context || outermost;
			}

			// Add elements passing elementMatchers directly to results
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;
					if ( !context && elem.ownerDocument !== document ) {
						setDocument( elem );
						xml = !documentIsHTML;
					}
					while ( (matcher = elementMatchers[j++]) ) {
						if ( matcher( elem, context || document, xml) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// `i` is now the count of elements visited above, and adding it to `matchedCount`
			// makes the latter nonnegative.
			matchedCount += i;

			// Apply set filters to unmatched elements
			// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
			// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
			// no element matchers and no seed.
			// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
			// case, which will result in a "00" `matchedCount` that differs from `i` but is also
			// numerically zero.
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( (matcher = setMatchers[j++]) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( (selector = compiled.selector || selector) );

	results = results || [];

	// Try to minimize operations if there is only one selector in the list and no seed
	// (the latter of which guarantees us context)
	if ( match.length === 1 ) {

		// Reduce context if the leading compound selector is an ID
		tokens = match[0] = match[0].slice( 0 );
		if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
				support.getById && context.nodeType === 9 && documentIsHTML &&
				Expr.relative[ tokens[1].type ] ) {

			context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[i];

			// Abort if we hit a combinator
			if ( Expr.relative[ (type = token.type) ] ) {
				break;
			}
			if ( (find = Expr.find[ type ]) ) {
				// Search, expanding context for leading sibling combinators
				if ( (seed = find(
					token.matches[0].replace( runescape, funescape ),
					rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
				)) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		!context || rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( div1 ) {
	// Should return 1, but returns 4 (following)
	return div1.compareDocumentPosition( document.createElement("div") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( div ) {
	div.innerHTML = "<a href='#'></a>";
	return div.firstChild.getAttribute("href") === "#" ;
}) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	});
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( div ) {
	div.innerHTML = "<input/>";
	div.firstChild.setAttribute( "value", "" );
	return div.firstChild.getAttribute( "value" ) === "";
}) ) {
	addHandle( "value", function( elem, name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	});
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( div ) {
	return div.getAttribute("disabled") == null;
}) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
					(val = elem.getAttributeNode( name )) && val.specified ?
					val.value :
				null;
		}
	});
}

return Sizzle;

})( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;
jQuery.expr[":"] = jQuery.expr.pseudos;
jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;



var rneedsContext = jQuery.expr.match.needsContext;

var rsingleTag = (/^<([\w-]+)\s*\/?>(?:<\/\1>|)$/);



var risSimple = /^.[^:#\[\.,]*$/;

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			/* jshint -W018 */
			return !!qualifier.call( elem, i, elem ) !== not;
		});

	}

	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		});

	}

	if ( typeof qualifier === "string" ) {
		if ( risSimple.test( qualifier ) ) {
			return jQuery.filter( qualifier, elements, not );
		}

		qualifier = jQuery.filter( qualifier, elements );
	}

	return jQuery.grep( elements, function( elem ) {
		return ( indexOf.call( qualifier, elem ) > -1 ) !== not;
	});
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	return elems.length === 1 && elem.nodeType === 1 ?
		jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [] :
		jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
			return elem.nodeType === 1;
		}));
};

jQuery.fn.extend({
	find: function( selector ) {
		var i,
			len = this.length,
			ret = [],
			self = this;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter(function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			}) );
		}

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		return this.pushStack( len > 1 ? jQuery.uniqueSort( ret ) : ret );
	},
	filter: function( selector ) {
		return this.pushStack( winnow(this, selector || [], false) );
	},
	not: function( selector ) {
		return this.pushStack( winnow(this, selector || [], true) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
});


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	// Shortcut simple #id case for speed
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,

	init = jQuery.fn.init = function( selector, context, root ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// init accepts an alternate rootjQuery
		// so migrate can support jQuery.sub (gh-2101)
		root = root || rootjQuery;

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector[0] === "<" &&
				selector[ selector.length - 1 ] === ">" &&
				selector.length >= 3 ) {

				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && (match[1] || !context) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[1] ) {
					context = context instanceof jQuery ? context[0] : context;

					// Option to run scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[1],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[1] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {
							// Properties of context are called as methods if possible
							if ( jQuery.isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[2] );

					if ( elem ) {
						// Inject the element directly into the jQuery object
						this[0] = elem;
						this.length = 1;
					}
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || root ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this[0] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return root.ready !== undefined ?
				root.ready( selector ) :
				// Execute immediately if ready is not present
				selector( jQuery );
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,
	// Methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.extend({
	dir: function( elem, dir, until ) {
		var matched = [],
			truncate = until !== undefined;

		while ( (elem = elem[ dir ]) && elem.nodeType !== 9 ) {
			if ( elem.nodeType === 1 ) {
				if ( truncate && jQuery( elem ).is( until ) ) {
					break;
				}
				matched.push( elem );
			}
		}
		return matched;
	},

	sibling: function( n, elem ) {
		var matched = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				matched.push( n );
			}
		}

		return matched;
	}
});

jQuery.fn.extend({
	has: function( target ) {
		var targets = jQuery( target, this ),
			l = targets.length;

		return this.filter(function() {
			var i = 0;
			for ( ; i < l; i++ ) {
				if ( jQuery.contains( this, targets[i] ) ) {
					return true;
				}
			}
		});
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			pos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?
				jQuery( selectors, context || this.context ) :
				0;

		for ( ; i < l; i++ ) {
			for ( cur = this[i]; cur && cur !== context; cur = cur.parentNode ) {
				// Always skip document fragments
				if ( cur.nodeType < 11 && (pos ?
					pos.index(cur) > -1 :

					// Don't pass non-elements to Sizzle
					cur.nodeType === 1 &&
						jQuery.find.matchesSelector(cur, selectors)) ) {

					matched.push( cur );
					break;
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.uniqueSort( matched ) : matched );
	},

	// Determine the position of an element within the set
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
		}

		// Index in selector
		if ( typeof elem === "string" ) {
			return indexOf.call( jQuery( elem ), this[ 0 ] );
		}

		// Locate the position of the desired element
		return indexOf.call( this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[ 0 ] : elem
		);
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.uniqueSort(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter(selector)
		);
	}
});

function sibling( cur, dir ) {
	while ( (cur = cur[dir]) && cur.nodeType !== 1 ) {}
	return cur;
}

jQuery.each({
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return jQuery.dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return jQuery.dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return jQuery.dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return jQuery.sibling( elem.firstChild );
	},
	contents: function( elem ) {
		return elem.contentDocument || jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var matched = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			matched = jQuery.filter( selector, matched );
		}

		if ( this.length > 1 ) {
			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				jQuery.uniqueSort( matched );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				matched.reverse();
			}
		}

		return this.pushStack( matched );
	};
});
var rnotwhite = (/\S+/g);



// Convert String-formatted options into Object-formatted ones
function createOptions( options ) {
	var object = {};
	jQuery.each( options.match( rnotwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		createOptions( options ) :
		jQuery.extend( {}, options );

	var // Flag to know if list is currently firing
		firing,
		// Last fire value for non-forgettable lists
		memory,
		// Flag to know if list was already fired
		fired,
		// Flag to prevent firing
		locked,
		// Actual callback list
		list = [],
		// Queue of execution data for repeatable lists
		queue = [],
		// Index of currently firing callback (modified by add/remove as needed)
		firingIndex = -1,
		// Fire callbacks
		fire = function() {

			// Enforce single-firing
			locked = options.once;

			// Execute callbacks for all pending executions,
			// respecting firingIndex overrides and runtime changes
			fired = firing = true;
			for ( ; queue.length; firingIndex = -1 ) {
				memory = queue.shift();
				while ( ++firingIndex < list.length ) {

					// Run callback and check for early termination
					if ( list[ firingIndex ].apply( memory[ 0 ], memory[ 1 ] ) === false &&
						options.stopOnFalse ) {

						// Jump to end and forget the data so .add doesn't re-fire
						firingIndex = list.length;
						memory = false;
					}
				}
			}

			// Forget the data if we're done with it
			if ( !options.memory ) {
				memory = false;
			}

			firing = false;

			// Clean up if we're done firing for good
			if ( locked ) {

				// Keep an empty list if we have data for future add calls
				if ( memory ) {
					list = [];

				// Otherwise, this object is spent
				} else {
					list = "";
				}
			}
		},

		// Actual Callbacks object
		self = {

			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {

					// If we have memory from a past run, we should fire after adding
					if ( memory && !firing ) {
						firingIndex = list.length - 1;
						queue.push( memory );
					}

					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							if ( jQuery.isFunction( arg ) ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && jQuery.type( arg ) !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );

					if ( memory && !firing ) {
						fire();
					}
				}
				return this;
			},

			// Remove a callback from the list
			remove: function() {
				jQuery.each( arguments, function( _, arg ) {
					var index;
					while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
						list.splice( index, 1 );

						// Handle firing indexes
						if ( index <= firingIndex ) {
							firingIndex--;
						}
					}
				});
				return this;
			},

			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ?
					jQuery.inArray( fn, list ) > -1 :
					list.length > 0;
			},

			// Remove all callbacks from the list
			empty: function() {
				if ( list ) {
					list = [];
				}
				return this;
			},

			// Disable .fire and .add
			// Abort any current/pending executions
			// Clear all callbacks and values
			disable: function() {
				locked = queue = [];
				list = memory = "";
				return this;
			},
			disabled: function() {
				return !list;
			},

			// Disable .fire
			// Also disable .add unless we have memory (since it would have no effect)
			// Abort any pending executions
			lock: function() {
				locked = queue = [];
				if ( !memory && !firing ) {
					list = memory = "";
				}
				return this;
			},
			locked: function() {
				return !!locked;
			},

			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( !locked ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					queue.push( args );
					if ( !firing ) {
						fire();
					}
				}
				return this;
			},

			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},

			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


function Identity( v ) {
	return v;
}
function Thrower( ex ) {
	throw ex;
}

jQuery.extend({

	Deferred: function( func ) {
		var tuples = [
				// action, add listener, callbacks,
				// ... .then handlers, argument index, [final state]
				[ "notify", "progress", jQuery.Callbacks("memory"),
					jQuery.Callbacks("memory"), 2 ],
				[ "resolve", "done", jQuery.Callbacks("once memory"),
					jQuery.Callbacks("once memory"), 0, "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"),
					jQuery.Callbacks("once memory"), 1, "rejected" ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				"catch": function( fn ) {
					return promise.then( null, fn );
				},
				// Keep pipe for back-compat
				pipe: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;

					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							// Map tuples (progress, done, fail) to arguments (done, fail, progress)
							var fn = jQuery.isFunction( fns[ tuple[ 4 ] ] ) && fns[ tuple[ 4 ] ];

							// deferred.progress(function() { bind to newDefer or newDefer.notify })
							// deferred.done(function() { bind to newDefer or newDefer.resolve })
							// deferred.fail(function() { bind to newDefer or newDefer.reject })
							deferred[ tuple[1] ](function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && jQuery.isFunction( returned.promise ) ) {
									returned.promise()
										.progress( newDefer.notify )
										.done( newDefer.resolve )
										.fail( newDefer.reject );
								} else {
									newDefer[ tuple[ 0 ] + "With" ](
										this === promise ? newDefer.promise() : this,
										fn ? [ returned ] : arguments
									);
								}
							});
						});
						fns = null;
					}).promise();
				},
				then: function( onFulfilled, onRejected, onProgress ) {
					var maxDepth = 0;
					function resolve( depth, deferred, handler, special ) {
						return function() {
							var that = this === promise ? undefined : this,
								args = arguments,
								mightThrow = function() {
									var returned, then;

									// Support: Promises/A+ section 2.3.3.3.3
									// https://promisesaplus.com/#point-59
									// Ignore double-resolution attempts
									if ( depth < maxDepth ) {
										return;
									}

									returned = handler.apply( that, args );

									// Support: Promises/A+ section 2.3.1
									// https://promisesaplus.com/#point-48
									if ( returned === deferred.promise() ) {
										throw new TypeError( "Thenable self-resolution" );
									}

									// Support: Promises/A+ sections 2.3.3.1, 3.5
									// https://promisesaplus.com/#point-54
									// https://promisesaplus.com/#point-75
									// Retrieve `then` only once
									then = returned &&

										// Support: Promises/A+ section 2.3.4
										// https://promisesaplus.com/#point-64
										// Only check objects and functions for thenability
										( typeof returned === "object" ||
											typeof returned === "function" ) &&
										returned.then;

									// Handle a returned thenable
									if ( jQuery.isFunction( then ) ) {
										// Special processors (notify) just wait for resolution
										if ( special ) {
											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special )
											);

										// Normal processors (resolve) also hook into progress
										} else {

											// ...and disregard older resolution values
											maxDepth++;

											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special ),
												resolve( maxDepth, deferred, Identity,
													deferred.notify )
											);
										}

									// Handle all other returned values
									} else {
										// Only substitue handlers pass on context
										// and multiple values (non-spec behavior)
										if ( handler !== Identity ) {
											that = undefined;
											args = [ returned ];
										}

										// Process the value(s)
										// Default process is resolve
										( special || deferred.resolveWith )(
											that || deferred.promise(), args );
									}
								},

								// Only normal processors (resolve) catch and reject exceptions
								process = special ?
									mightThrow :
									function() {
										try {
											mightThrow();
										} catch ( e ) {

											// Support: Promises/A+ section 2.3.3.3.4.1
											// https://promisesaplus.com/#point-61
											// Ignore post-resolution exceptions
											if ( depth + 1 >= maxDepth ) {
												// Only substitue handlers pass on context
												// and multiple values (non-spec behavior)
												if ( handler !== Thrower ) {
													that = undefined;
													args = [ e ];
												}

												deferred.rejectWith( that || deferred.promise(),
													args );
											}
										}
									};

							// Support: Promises/A+ section 2.3.3.3.1
							// https://promisesaplus.com/#point-57
							// Re-resolve promises immediately to dodge false rejection from
							// subsequent errors
							if ( depth ) {
								process();
							} else {
								window.setTimeout( process );
							}
						};
					}

					return jQuery.Deferred(function( newDefer ) {
						// progress_handlers.add( ... )
						tuples[ 0 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onProgress ) ?
									onProgress :
									Identity,
								newDefer.notifyWith
							)
						);

						// fulfilled_handlers.add( ... )
						tuples[ 1 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onFulfilled ) ?
									onFulfilled :
									Identity
							)
						);

						// rejected_handlers.add( ... )
						tuples[ 2 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								jQuery.isFunction( onRejected ) ?
									onRejected :
									Thrower
							)
						);
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 5 ];

			// promise.progress = list.add
			// promise.done = list.add
			// promise.fail = list.add
			promise[ tuple[1] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(
					function() {
						// state = "resolved" (i.e., fulfilled)
						// state = "rejected"
						state = stateString;
					},

					// rejected_callbacks.disable
					// fulfilled_callbacks.disable
					tuples[ 3 - i ][ 2 ].disable,

					// progress_callbacks.lock
					tuples[ 0 ][ 2 ].lock
				);
			}

			// progress_handlers.fire
			// fulfilled_handlers.fire
			// rejected_handlers.fire
			list.add( tuple[ 3 ].fire );

			// deferred.notify = function() { deferred.notifyWith(...) }
			// deferred.resolve = function() { deferred.resolveWith(...) }
			// deferred.reject = function() { deferred.rejectWith(...) }
			deferred[ tuple[0] ] = function() {
				deferred[ tuple[0] + "With" ]( this === deferred ? promise : this, arguments );
				return this;
			};

			// deferred.notifyWith = list.fireWith
			// deferred.resolveWith = list.fireWith
			// deferred.rejectWith = list.fireWith
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( subordinate /* , ..., subordinateN */ ) {
		var method,
			i = 0,
			resolveValues = slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 ||
				( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred.
			// If resolveValues consist of only a single Deferred, just use that.
			master = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( values === progressValues ) {
						master.notifyWith( contexts, values );
					} else if ( !( --remaining ) ) {
						master.resolveWith( contexts, values );
					}
				};
			},
			progressValues, progressContexts, resolveContexts;

		// Add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] &&
					jQuery.isFunction( (method = resolveValues[ i ].promise) ) ) {

					method.call( resolveValues[ i ] )
						.progress( updateFunc( i, progressContexts, progressValues ) )
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( master.reject );
				} else if ( resolveValues[ i ] &&
					jQuery.isFunction( (method = resolveValues[ i ].then) ) ) {

					method.call(
						resolveValues[ i ],
						updateFunc( i, resolveContexts, resolveValues ),
						master.reject,
						updateFunc( i, progressContexts, progressValues )
					);
				} else {
					--remaining;
				}
			}
		}

		// If we're not waiting on anything, resolve the master
		if ( !remaining ) {
			master.resolveWith( resolveContexts, resolveValues );
		}

		return master.promise();
	}
});


// The deferred used on DOM ready
var readyList;

jQuery.fn.ready = function( fn ) {
	// Add the callback
	jQuery.ready.promise().done( fn );

	return this;
};

jQuery.extend({
	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Hold (or release) the ready event
	holdReady: function( hold ) {
		if ( hold ) {
			jQuery.readyWait++;
		} else {
			jQuery.ready( true );
		}
	},

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );
	}
});

/**
 * The ready event handler and self cleanup method
 */
function completed() {
	document.removeEventListener( "DOMContentLoaded", completed );
	window.removeEventListener( "load", completed );
	jQuery.ready();
}

jQuery.ready.promise = function( obj ) {
	if ( !readyList ) {

		readyList = jQuery.Deferred();

		// Catch cases where $(document).ready() is called
		// after the browser event has already occurred.
		// We once tried to use readyState "interactive" here,
		// but it caused issues like the one
		// discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
		if ( document.readyState === "complete" ) {
			// Handle it asynchronously to allow scripts the opportunity to delay ready
			window.setTimeout( jQuery.ready );

		} else {

			// Use the handy event callback
			document.addEventListener( "DOMContentLoaded", completed );

			// A fallback to window.onload, that will always work
			window.addEventListener( "load", completed );
		}
	}
	return readyList.promise( obj );
};

// Kick off the DOM ready check even if the user does not
jQuery.ready.promise();




// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = jQuery.access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		len = elems.length,
		bulk = key == null;

	// Sets many values
	if ( jQuery.type( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			access( elems, fn, i, key[i], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !jQuery.isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {
			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < len; i++ ) {
				fn( elems[i], key, raw ? value : value.call( elems[i], i, fn( elems[i], key ) ) );
			}
		}
	}

	return chainable ?
		elems :

		// Gets
		bulk ?
			fn.call( elems ) :
			len ? fn( elems[0], key ) : emptyGet;
};


/**
 * Determines whether an object can have data
 */
jQuery.acceptData = function( owner ) {
	// Accepts only:
	//  - Node
	//    - Node.ELEMENT_NODE
	//    - Node.DOCUMENT_NODE
	//  - Object
	//    - Any
	/* jshint -W018 */
	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
};


function Data() {
	this.expando = jQuery.expando + Data.uid++;
}

Data.uid = 1;
Data.accepts = jQuery.acceptData;

Data.prototype = {

	register: function( owner ) {
		var value = {};

		// If it is a node unlikely to be stringify-ed or looped over
		// use plain assignment
		if ( owner.nodeType ) {
			owner[ this.expando ] = value;

		// Otherwise secure it in a non-enumerable, non-writable property
		// configurability must be true to allow the property to be
		// deleted with the delete operator
		} else {
			Object.defineProperty( owner, this.expando, {
				value: value,
				writable: true,
				configurable: true
			});
		}
		return owner[ this.expando ];
	},
	cache: function( owner ) {

		// We can accept data for non-element nodes in modern browsers,
		// but we should not, see #8335.
		// Always return an empty object.
		if ( !Data.accepts( owner ) ) {
			return {};
		}

		// Check if the owner object already has a cache
		var cache = owner[ this.expando ];

		// If so, return it
		if ( cache ) {
			return cache;
		}

		// If not, register one
		return this.register( owner );
	},
	set: function( owner, data, value ) {
		var prop,
			cache = this.cache( owner );

		// Handle: [ owner, key, value ] args
		// Always use camelCase key (gh-2257)
		if ( typeof data === "string" ) {
			cache[ jQuery.camelCase( data ) ] = value;

		// Handle: [ owner, { properties } ] args
		} else {

			// Copy the properties one-by-one to the cache object
			for ( prop in data ) {
				cache[ jQuery.camelCase( prop ) ] = data[ prop ];
			}
		}
		return cache;
	},
	get: function( owner, key ) {
		var cache = this.cache( owner );

		return key === undefined ?
			cache :

			// Always use camelCase key (gh-2257)
			cache[ jQuery.camelCase( key ) ];
	},
	access: function( owner, key, value ) {

		// In cases where either:
		//
		//   1. No key was specified
		//   2. A string key was specified, but no value provided
		//
		// Take the "read" path and allow the get method to determine
		// which value to return, respectively either:
		//
		//   1. The entire cache object
		//   2. The data stored at the key
		//
		if ( key === undefined ||
				( ( key && typeof key === "string" ) && value === undefined ) ) {

			return this.get( owner, key );
		}

		// [*]When the key is not a string, or both a key and value
		// are specified, set or extend (existing objects) with either:
		//
		//   1. An object of properties
		//   2. A key and value
		//
		this.set( owner, key, value );

		// Since the "set" path can have two possible entry points
		// return the expected data based on which path was taken[*]
		return value !== undefined ? value : key;
	},
	remove: function( owner, key ) {
		var i,
			cache = owner[ this.expando ];

		if ( cache === undefined ) {
			return;
		}

		if ( key !== undefined ) {

			// Support array or space separated string of keys
			if ( jQuery.isArray( key ) ) {

				// If key is an array of keys...
				// We always set camelCase keys, so remove that.
				key = key.map( jQuery.camelCase );
			} else {
				key = jQuery.camelCase( key );

				// If a key with the spaces exists, use it.
				// Otherwise, create an array by matching non-whitespace
				key = key in cache ?
					[ key ] :
					( key.match( rnotwhite ) || [] );
			}

			i = key.length;

			while ( i-- ) {
				delete cache[ key[ i ] ];
			}
		}

		// Remove the expando if there's no more data
		if ( key === undefined || jQuery.isEmptyObject( cache ) ) {
			delete owner[ this.expando ];
		}
	},
	hasData: function( owner ) {
		var cache = owner[ this.expando ];
		return cache !== undefined && !jQuery.isEmptyObject( cache );
	}
};
var dataPriv = new Data();

var dataUser = new Data();



//	Implementation Summary
//
//	1. Enforce API surface and semantic compatibility with 1.9.x branch
//	2. Improve the module's maintainability by reducing the storage
//		paths to a single mechanism.
//	3. Use the same single mechanism to support "private" and "user" data.
//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
//	5. Avoid exposing implementation details on user objects (eg. expando properties)
//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /[A-Z]/g;

function dataAttr( elem, key, data ) {
	var name;

	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {
		name = "data-" + key.replace( rmultiDash, "-$&" ).toLowerCase();
		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = data === "true" ? true :
					data === "false" ? false :
					data === "null" ? null :
					// Only convert to a number if it doesn't change the string
					+data + "" === data ? +data :
					rbrace.test( data ) ? jQuery.parseJSON( data ) :
					data;
			} catch ( e ) {}

			// Make sure we set the data so it isn't changed later
			dataUser.set( elem, key, data );
		} else {
			data = undefined;
		}
	}
	return data;
}

jQuery.extend({
	hasData: function( elem ) {
		return dataUser.hasData( elem ) || dataPriv.hasData( elem );
	},

	data: function( elem, name, data ) {
		return dataUser.access( elem, name, data );
	},

	removeData: function( elem, name ) {
		dataUser.remove( elem, name );
	},

	// TODO: Now that all calls to _data and _removeData have been replaced
	// with direct calls to dataPriv methods, these can be deprecated.
	_data: function( elem, name, data ) {
		return dataPriv.access( elem, name, data );
	},

	_removeData: function( elem, name ) {
		dataPriv.remove( elem, name );
	}
});

jQuery.fn.extend({
	data: function( key, value ) {
		var i, name, data,
			elem = this[ 0 ],
			attrs = elem && elem.attributes;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = dataUser.get( elem );

				if ( elem.nodeType === 1 && !dataPriv.get( elem, "hasDataAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {

						// Support: IE11+
						// The attrs elements can be null (#14894)
						if ( attrs[ i ] ) {
							name = attrs[ i ].name;
							if ( name.indexOf( "data-" ) === 0 ) {
								name = jQuery.camelCase( name.slice(5) );
								dataAttr( elem, name, data[ name ] );
							}
						}
					}
					dataPriv.set( elem, "hasDataAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each(function() {
				dataUser.set( this, key );
			});
		}

		return access( this, function( value ) {
			var data;

			// The calling jQuery object (element matches) is not empty
			// (and therefore has an element appears at this[ 0 ]) and the
			// `value` parameter was not undefined. An empty jQuery object
			// will result in `undefined` for elem = this[ 0 ] which will
			// throw an exception if an attempt to read a data cache is made.
			if ( elem && value === undefined ) {

				// Attempt to get data from the cache
				// The key will always be camelCased in Data
				data = dataUser.get( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to "discover" the data in
				// HTML5 custom data-* attrs
				data = dataAttr( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// We tried really hard, but the data doesn't exist.
				return;
			}

			// Set the data...
			this.each(function() {

				// We always store the camelCased key
				dataUser.set( this, key, value );
			});
		}, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each(function() {
			dataUser.remove( this, key );
		});
	}
});


jQuery.extend({
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = dataPriv.get( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || jQuery.isArray( data ) ) {
					queue = dataPriv.access( elem, type, jQuery.makeArray(data) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// Clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// Not public - generate a queueHooks object, or return the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return dataPriv.get( elem, key ) || dataPriv.access( elem, key, {
			empty: jQuery.Callbacks("once memory").add(function() {
				dataPriv.remove( elem, [ type + "queue", key ] );
			})
		});
	}
});

jQuery.fn.extend({
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[0], type );
		}

		return data === undefined ?
			this :
			this.each(function() {
				var queue = jQuery.queue( this, type, data );

				// Ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[0] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			});
	},
	dequeue: function( type ) {
		return this.each(function() {
			jQuery.dequeue( this, type );
		});
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},
	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = dataPriv.get( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
});
var pnum = (/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/).source;

var rcssNum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" );


var rcheckableType = (/^(?:checkbox|radio)$/i);

var rtagName = ( /<([\w:-]+)/ );

var rscriptType = ( /^$|\/(?:java|ecma)script/i );



// We have to close these tags to support XHTML (#13200)
var wrapMap = {

	// Support: IE9
	option: [ 1, "<select multiple='multiple'>", "</select>" ],

	thead: [ 1, "<table>", "</table>" ],

	// Some of the following wrappers are not fully defined, because
	// their parent elements (except for "table" element) could be omitted
	// since browser parsers are smart enough to auto-insert them

	// Support: Android 2.3
	// Android browser doesn't auto-insert colgroup
	col: [ 2, "<table><colgroup>", "</colgroup></table>" ],

	// Auto-insert "tbody" element
	tr: [ 2, "<table>", "</table>" ],

	// Auto-insert "tbody" and "tr" elements
	td: [ 3, "<table>", "</table>" ],

	_default: [ 0, "", "" ]
};

// Support: IE9
wrapMap.optgroup = wrapMap.option;

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;


function getAll( context, tag ) {
	// Support: IE9-11+
	// Use typeof to avoid zero-argument method invocation on host objects (#15151)
	var ret = typeof context.getElementsByTagName !== "undefined" ?
			context.getElementsByTagName( tag || "*" ) :
			typeof context.querySelectorAll !== "undefined" ?
				context.querySelectorAll( tag || "*" ) :
			[];

	return tag === undefined || tag && jQuery.nodeName( context, tag ) ?
		jQuery.merge( [ context ], ret ) :
		ret;
}


// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		dataPriv.set(
			elems[ i ],
			"globalEval",
			!refElements || dataPriv.get( refElements[ i ], "globalEval" )
		);
	}
}


var rhtml = /<|&#?\w+;/;

function buildFragment( elems, context, scripts, selection, ignored ) {
	var elem, tmp, tag, wrap, contains, j,
		fragment = context.createDocumentFragment(),
		nodes = [],
		i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		elem = elems[ i ];

		if ( elem || elem === 0 ) {

			// Add nodes directly
			if ( jQuery.type( elem ) === "object" ) {
				// Support: Android<4.1, PhantomJS<2
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

			// Convert non-html into a text node
			} else if ( !rhtml.test( elem ) ) {
				nodes.push( context.createTextNode( elem ) );

			// Convert html into DOM nodes
			} else {
				tmp = tmp || fragment.appendChild( context.createElement( "div" ) );

				// Deserialize a standard representation
				tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
				wrap = wrapMap[ tag ] || wrapMap._default;
				tmp.innerHTML = wrap[ 1 ] + jQuery.htmlPrefilter( elem ) + wrap[ 2 ];

				// Descend through wrappers to the right content
				j = wrap[ 0 ];
				while ( j-- ) {
					tmp = tmp.lastChild;
				}

				// Support: Android<4.1, PhantomJS<2
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, tmp.childNodes );

				// Remember the top-level container
				tmp = fragment.firstChild;

				// Ensure the created nodes are orphaned (#12392)
				tmp.textContent = "";
			}
		}
	}

	// Remove wrapper from fragment
	fragment.textContent = "";

	i = 0;
	while ( ( elem = nodes[ i++ ] ) ) {

		// Skip elements already in the context collection (trac-4087)
		if ( selection && jQuery.inArray( elem, selection ) > -1 ) {
			if ( ignored ) {
				ignored.push( elem );
			}
			continue;
		}

		contains = jQuery.contains( elem.ownerDocument, elem );

		// Append to fragment
		tmp = getAll( fragment.appendChild( elem ), "script" );

		// Preserve script evaluation history
		if ( contains ) {
			setGlobalEval( tmp );
		}

		// Capture executables
		if ( scripts ) {
			j = 0;
			while ( ( elem = tmp[ j++ ] ) ) {
				if ( rscriptType.test( elem.type || "" ) ) {
					scripts.push( elem );
				}
			}
		}
	}

	return fragment;
}


(function() {
	var fragment = document.createDocumentFragment(),
		div = fragment.appendChild( document.createElement( "div" ) ),
		input = document.createElement( "input" );

	// Support: Android 4.0-4.3
	// Check state lost if the name is set (#11217)
	// Support: Windows Web Apps (WWA)
	// `name` and `type` must use .setAttribute for WWA (#14901)
	input.setAttribute( "type", "radio" );
	input.setAttribute( "checked", "checked" );
	input.setAttribute( "name", "t" );

	div.appendChild( input );

	// Support: Android<4.2
	// Older WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Support: IE<=11+
	// Make sure textarea (and checkbox) defaultValue is properly cloned
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;
})();


support.focusin = "onfocusin" in window;


var
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
	rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

// Support: IE9
// See #13393 for more info
function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

function on( elem, types, selector, data, fn, one ) {
	var origFn, type;

	// Types can be a map of types/handlers
	if ( typeof types === "object" ) {
		// ( types-Object, selector, data )
		if ( typeof selector !== "string" ) {
			// ( types-Object, data )
			data = data || selector;
			selector = undefined;
		}
		for ( type in types ) {
			on( elem, type, selector, data, types[ type ], one );
		}
		return elem;
	}

	if ( data == null && fn == null ) {
		// ( types, fn )
		fn = selector;
		data = selector = undefined;
	} else if ( fn == null ) {
		if ( typeof selector === "string" ) {
			// ( types, selector, fn )
			fn = data;
			data = undefined;
		} else {
			// ( types, data, fn )
			fn = data;
			data = selector;
			selector = undefined;
		}
	}
	if ( fn === false ) {
		fn = returnFalse;
	}

	if ( one === 1 ) {
		origFn = fn;
		fn = function( event ) {
			// Can use an empty set, since event contains the info
			jQuery().off( event );
			return origFn.apply( this, arguments );
		};
		// Use same guid so caller can remove using origFn
		fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
	}
	return elem.each( function() {
		jQuery.event.add( this, types, fn, data, selector );
	});
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {

		var handleObjIn, eventHandle, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.get( elem );

		// Don't attach events to noData or text/comment nodes (but allow plain objects)
		if ( !elemData ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !(events = elemData.events) ) {
			events = elemData.events = {};
		}
		if ( !(eventHandle = elemData.handle) ) {
			eventHandle = elemData.handle = function( e ) {
				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ?
					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
			};
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend({
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join(".")
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !(handlers = events[ type ]) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener if the special events handler returns false
				if ( !special.setup ||
					special.setup.call( elem, data, namespaces, eventHandle ) === false ) {

					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var j, origCount, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.hasData( elem ) && dataPriv.get( elem );

		if ( !elemData || !(events = elemData.events) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnotwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[t] ) || [];
			type = origType = tmp[1];
			namespaces = ( tmp[2] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[2] && new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector ||
						selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown ||
					special.teardown.call( elem, namespaces, elemData.handle ) === false ) {

					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove data and the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			dataPriv.remove( elem, "handle events" );
		}
	},

	trigger: function( event, data, elem, onlyHandlers ) {

		var i, cur, tmp, bubbleType, ontype, handle, special,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split(".") : [];

		cur = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf(".") > -1 ) {
			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split(".");
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf(":") < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join(".");
		event.rnamespace = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === (elem.ownerDocument || document) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( (cur = eventPath[i++]) && !event.isPropagationStopped() ) {

			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( dataPriv.get( cur, "events" ) || {} )[ event.type ] &&
				dataPriv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && jQuery.acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( (!special._default || special._default.apply( eventPath.pop(), data ) === false) &&
				jQuery.acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name name as the event.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && jQuery.isFunction( elem[ type ] ) && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					elem[ type ]();
					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	dispatch: function( event ) {

		// Make a writable jQuery.Event from the native event object
		event = jQuery.event.fix( event );

		var i, j, ret, matched, handleObj,
			handlerQueue = [],
			args = slice.call( arguments ),
			handlers = ( dataPriv.get( this, "events" ) || {} )[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[0] = event;
		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( (matched = handlerQueue[ i++ ]) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( (handleObj = matched.handlers[ j++ ]) &&
				!event.isImmediatePropagationStopped() ) {

				// Triggered event must either 1) have no namespace, or 2) have namespace(s)
				// a subset or equal to those in the bound event (both can have no namespace).
				if ( !event.rnamespace || event.rnamespace.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle ||
						handleObj.handler ).apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( (event.result = ret) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var i, matches, sel, handleObj,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Support (at least): Chrome, IE9
		// Find delegate handlers
		// Black-hole SVG <use> instance trees (#13180)
		//
		// Support: Firefox
		// Avoid non-left-click bubbling in Firefox (#3861)
		if ( delegateCount && cur.nodeType && (!event.button || event.type !== "click") ) {

			for ( ; cur !== this; cur = cur.parentNode || this ) {

				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.disabled !== true || event.type !== "click" ) {
					matches = [];
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matches[ sel ] === undefined ) {
							matches[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) > -1 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matches[ sel ] ) {
							matches.push( handleObj );
						}
					}
					if ( matches.length ) {
						handlerQueue.push({ elem: cur, handlers: matches });
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		if ( delegateCount < handlers.length ) {
			handlerQueue.push({ elem: this, handlers: handlers.slice( delegateCount ) });
		}

		return handlerQueue;
	},

	// Includes some event props shared by KeyEvent and MouseEvent
	props: ( "altKey bubbles cancelable ctrlKey currentTarget detail eventPhase " +
		"metaKey relatedTarget shiftKey target timeStamp view which" ).split(" "),

	fixHooks: {},

	keyHooks: {
		props: "char charCode key keyCode".split(" "),
		filter: function( event, original ) {

			// Add which for key events
			if ( event.which == null ) {
				event.which = original.charCode != null ? original.charCode : original.keyCode;
			}

			return event;
		}
	},

	mouseHooks: {
		props: ( "button buttons clientX clientY offsetX offsetY pageX pageY " +
			"screenX screenY toElement" ).split(" "),
		filter: function( event, original ) {
			var eventDoc, doc, body,
				button = original.button;

			// Calculate pageX/Y if missing and clientX/Y available
			if ( event.pageX == null && original.clientX != null ) {
				eventDoc = event.target.ownerDocument || document;
				doc = eventDoc.documentElement;
				body = eventDoc.body;

				event.pageX = original.clientX +
					( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) -
					( doc && doc.clientLeft || body && body.clientLeft || 0 );
				event.pageY = original.clientY +
					( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) -
					( doc && doc.clientTop  || body && body.clientTop  || 0 );
			}

			// Add which for click: 1 === left; 2 === middle; 3 === right
			// Note: button is not normalized, so don't use it
			if ( !event.which && button !== undefined ) {
				event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
			}

			return event;
		}
	},

	fix: function( event ) {
		if ( event[ jQuery.expando ] ) {
			return event;
		}

		// Create a writable copy of the event object and normalize some properties
		var i, prop, copy,
			type = event.type,
			originalEvent = event,
			fixHook = this.fixHooks[ type ];

		if ( !fixHook ) {
			this.fixHooks[ type ] = fixHook =
				rmouseEvent.test( type ) ? this.mouseHooks :
				rkeyEvent.test( type ) ? this.keyHooks :
				{};
		}
		copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

		event = new jQuery.Event( originalEvent );

		i = copy.length;
		while ( i-- ) {
			prop = copy[ i ];
			event[ prop ] = originalEvent[ prop ];
		}

		// Support: Safari 6.0+
		// Target should not be a text node (#504, #13143)
		if ( event.target.nodeType === 3 ) {
			event.target = event.target.parentNode;
		}

		return fixHook.filter ? fixHook.filter( event, originalEvent ) : event;
	},

	special: {
		load: {
			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		focus: {
			// Fire native event if possible so blur/focus sequence is correct
			trigger: function() {
				if ( this !== safeActiveElement() && this.focus ) {
					this.focus();
					return false;
				}
			},
			delegateType: "focusin"
		},
		blur: {
			trigger: function() {
				if ( this === safeActiveElement() && this.blur ) {
					this.blur();
					return false;
				}
			},
			delegateType: "focusout"
		},
		click: {
			// For checkbox, fire native event so checked state will be right
			trigger: function() {
				if ( this.type === "checkbox" && this.click && jQuery.nodeName( this, "input" ) ) {
					this.click();
					return false;
				}
			},

			// For cross-browser consistency, don't fire native .click() on links
			_default: function( event ) {
				return jQuery.nodeName( event.target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined && event.originalEvent ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	},

	// Piggyback on a donor event to simulate a different one
	simulate: function( type, elem, event ) {
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true
				// Previously, `originalEvent: {}` was set here, so stopPropagation call
				// would not be triggered on donor event, since in our own
				// jQuery.event.stopPropagation function we had a check for existence of
				// originalEvent.stopPropagation method, so, consequently it would be a noop.
				//
				// But now, this "simulate" function is used only for events
				// for which stopPropagation() is noop, so there is no need for that anymore.
				//
				// For the compat branch though, guard for "click" and "submit"
				// events is still used, but was moved to jQuery.event.stopPropagation function
				// because `originalEvent` should point to the original event for the constancy
				// with other events and for more focused logic
			}
		);

		jQuery.event.trigger( e, null, elem );

		if ( e.isDefaultPrevented() ) {
			event.preventDefault();
		}
	}
};

jQuery.removeEvent = function( elem, type, handle ) {

	// This "if" is needed for plain objects
	if ( elem.removeEventListener ) {
		elem.removeEventListener( type, handle );
	}
};

jQuery.Event = function( src, props ) {
	// Allow instantiation without the 'new' keyword
	if ( !(this instanceof jQuery.Event) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined &&
				// Support: Android<4.0
				src.returnValue === false ?
			returnTrue :
			returnFalse;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	constructor: jQuery.Event,
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		if ( e ) {
			e.preventDefault();
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		if ( e ) {
			e.stopPropagation();
		}
	},
	stopImmediatePropagation: function() {
		var e = this.originalEvent;

		this.isImmediatePropagationStopped = returnTrue;

		if ( e ) {
			e.stopImmediatePropagation();
		}

		this.stopPropagation();
	}
};

// Create mouseenter/leave events using mouseover/out and event-time checks
// so that event delegation works in jQuery.
// Do the same for pointerenter/pointerleave and pointerover/pointerout
//
// Support: Safari<7.0
// Safari doesn't support mouseenter/mouseleave at all.
//
// Support: Chrome 34+
// Mouseenter doesn't perform while left mouse button is pressed
// (and initiated outside the observed element)
// https://code.google.com/p/chromium/issues/detail?id=333868
jQuery.each({
	mouseenter: "mouseover",
	mouseleave: "mouseout",
	pointerenter: "pointerover",
	pointerleave: "pointerout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mousenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || (related !== target && !jQuery.contains( target, related )) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
});

// Support: Firefox
// Firefox doesn't have focus(in | out) events
// Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
//
// Support: Chrome, Safari
// focus(in | out) events fire after focus & blur events,
// which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
// Related ticket - https://code.google.com/p/chromium/issues/detail?id=449857
if ( !support.focusin ) {
	jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
			jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ) );
		};

		jQuery.event.special[ fix ] = {
			setup: function() {
				var doc = this.ownerDocument || this,
					attaches = dataPriv.access( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				dataPriv.access( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this,
					attaches = dataPriv.access( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					dataPriv.remove( doc, fix );

				} else {
					dataPriv.access( doc, fix, attaches );
				}
			}
		};
	});
}

jQuery.fn.extend({

	on: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn );
	},
	one: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {
			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ?
					handleObj.origType + "." + handleObj.namespace :
					handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {
			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {
			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each(function() {
			jQuery.event.remove( this, types, fn, selector );
		});
	},

	trigger: function( type, data ) {
		return this.each(function() {
			jQuery.event.trigger( type, data, this );
		});
	},
	triggerHandler: function( type, data ) {
		var elem = this[0];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
});


var
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:-]+)[^>]*)\/>/gi,
	rnoInnerhtml = /<(?:script|style|link)/i,
	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptTypeMasked = /^true\/(.*)/,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

function manipulationTarget( elem, content ) {
	if ( jQuery.nodeName( elem, "table" ) &&
		jQuery.nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ) {

		return elem.getElementsByTagName( "tbody" )[ 0 ] || elem;
	}

	return elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = (elem.getAttribute("type") !== null) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	var match = rscriptTypeMasked.exec( elem.type );

	if ( match ) {
		elem.type = match[ 1 ];
	} else {
		elem.removeAttribute("type");
	}

	return elem;
}

function cloneCopyEvent( src, dest ) {
	var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

	if ( dest.nodeType !== 1 ) {
		return;
	}

	// 1. Copy private data: events, handlers, etc.
	if ( dataPriv.hasData( src ) ) {
		pdataOld = dataPriv.access( src );
		pdataCur = dataPriv.set( dest, pdataOld );
		events = pdataOld.events;

		if ( events ) {
			delete pdataCur.handle;
			pdataCur.events = {};

			for ( type in events ) {
				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
					jQuery.event.add( dest, type, events[ type ][ i ] );
				}
			}
		}
	}

	// 2. Copy user data
	if ( dataUser.hasData( src ) ) {
		udataOld = dataUser.access( src );
		udataCur = jQuery.extend( {}, udataOld );

		dataUser.set( dest, udataCur );
	}
}

// Fix IE bugs, see support tests
function fixInput( src, dest ) {
	var nodeName = dest.nodeName.toLowerCase();

	// Fails to persist the checked state of a cloned checkbox or radio button.
	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		dest.checked = src.checked;

	// Fails to return the selected option to the default selected state when cloning options
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

function domManip( collection, args, callback, ignored ) {

	// Flatten any nested arrays
	args = concat.apply( [], args );

	var fragment, first, scripts, hasScripts, node, doc,
		i = 0,
		l = collection.length,
		iNoClone = l - 1,
		value = args[ 0 ],
		isFunction = jQuery.isFunction( value );

	// We can't cloneNode fragments that contain checked, in WebKit
	if ( isFunction ||
			( l > 1 && typeof value === "string" &&
				!support.checkClone && rchecked.test( value ) ) ) {
		return collection.each(function( index ) {
			var self = collection.eq( index );
			if ( isFunction ) {
				args[ 0 ] = value.call( this, index, self.html() );
			}
			domManip( self, args, callback, ignored );
		});
	}

	if ( l ) {
		fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
		first = fragment.firstChild;

		if ( fragment.childNodes.length === 1 ) {
			fragment = first;
		}

		// Require either new content or an interest in ignored elements to invoke the callback
		if ( first || ignored ) {
			scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
			hasScripts = scripts.length;

			// Use the original fragment for the last item
			// instead of the first because it can end up
			// being emptied incorrectly in certain situations (#8070).
			for ( ; i < l; i++ ) {
				node = fragment;

				if ( i !== iNoClone ) {
					node = jQuery.clone( node, true, true );

					// Keep references to cloned scripts for later restoration
					if ( hasScripts ) {
						// Support: Android<4.1, PhantomJS<2
						// push.apply(_, arraylike) throws on ancient WebKit
						jQuery.merge( scripts, getAll( node, "script" ) );
					}
				}

				callback.call( collection[ i ], node, i );
			}

			if ( hasScripts ) {
				doc = scripts[ scripts.length - 1 ].ownerDocument;

				// Reenable scripts
				jQuery.map( scripts, restoreScript );

				// Evaluate executable scripts on first document insertion
				for ( i = 0; i < hasScripts; i++ ) {
					node = scripts[ i ];
					if ( rscriptType.test( node.type || "" ) &&
						!dataPriv.access( node, "globalEval" ) &&
						jQuery.contains( doc, node ) ) {

						if ( node.src ) {
							// Optional AJAX dependency, but won't run scripts if not present
							if ( jQuery._evalUrl ) {
								jQuery._evalUrl( node.src );
							}
						} else {
							jQuery.globalEval( node.textContent.replace( rcleanScript, "" ) );
						}
					}
				}
			}
		}
	}

	return collection;
}

function remove( elem, selector, keepData ) {
	var node,
		nodes = selector ? jQuery.filter( selector, elem ) : elem,
		i = 0;

	for ( ; (node = nodes[i]) != null; i++ ) {
		if ( !keepData && node.nodeType === 1 ) {
			jQuery.cleanData( getAll( node ) );
		}

		if ( node.parentNode ) {
			if ( keepData && jQuery.contains( node.ownerDocument, node ) ) {
				setGlobalEval( getAll( node, "script" ) );
			}
			node.parentNode.removeChild( node );
		}
	}

	return elem;
}

jQuery.extend({
	htmlPrefilter: function( html ) {
		return html.replace( rxhtmlTag, "<$1></$2>" );
	},

	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var i, l, srcElements, destElements,
			clone = elem.cloneNode( true ),
			inPage = jQuery.contains( elem.ownerDocument, elem );

		// Fix IE cloning issues
		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
				!jQuery.isXMLDoc( elem ) ) {

			// We eschew Sizzle here for performance reasons: http://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			for ( i = 0, l = srcElements.length; i < l; i++ ) {
				fixInput( srcElements[ i ], destElements[ i ] );
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		// Return the cloned set
		return clone;
	},

	cleanData: function( elems ) {
		var data, elem, type,
			special = jQuery.event.special,
			i = 0;

		for ( ; (elem = elems[ i ]) !== undefined; i++ ) {
			if ( jQuery.acceptData( elem ) && (data = elem[ dataPriv.expando ])) {
				if ( data.events ) {
					for ( type in data.events ) {
						if ( special[ type ] ) {
							jQuery.event.remove( elem, type );

						// This is a shortcut to avoid jQuery.event.remove's overhead
						} else {
							jQuery.removeEvent( elem, type, data.handle );
						}
					}
				}
				delete elem[ dataPriv.expando ];
			}
		}
	}
});

jQuery.fn.extend({
	detach: function( selector ) {
		return remove( this, selector, true );
	},

	remove: function( selector ) {
		return remove( this, selector );
	},

	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().each(function() {
					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
						this.textContent = value;
					}
				});
		}, null, value, arguments.length );
	},

	append: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		});
	},

	prepend: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		});
	},

	before: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		});
	},

	after: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		});
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; (elem = this[i]) != null; i++ ) {
			if ( elem.nodeType === 1 ) {

				// Prevent memory leaks
				jQuery.cleanData( getAll( elem, false ) );

				// Remove any remaining nodes
				elem.textContent = "";
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map(function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		});
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined && elem.nodeType === 1 ) {
				return elem.innerHTML;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

				value = jQuery.htmlPrefilter( value );

				try {
					for ( ; i < l; i++ ) {
						elem = this[ i ] || {};

						// Remove element nodes and prevent memory leaks
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch ( e ) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var ignored = [];

		// Make the changes, replacing each non-ignored context element with the new content
		return domManip( this, arguments, function( elem ) {
			var parent = this.parentNode;

			if ( jQuery.inArray( this, ignored ) < 0 ) {
				jQuery.cleanData( getAll( this ) );
				if ( parent ) {
					parent.replaceChild( elem, this );
				}
			}

		// Force callback invocation
		}, ignored );
	}
});

jQuery.each({
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1,
			i = 0;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone( true );
			jQuery( insert[ i ] )[ original ]( elems );

			// Support: Android<4.1, PhantomJS<2
			// .get() because push.apply(_, arraylike) throws on ancient WebKit
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
});
var documentElement = document.documentElement;



// Based off of the plugin by Clint Helfers, with permission.
// http://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = window.setTimeout( next, time );
		hooks.stop = function() {
			window.clearTimeout( timeout );
		};
	});
};


(function() {
	var input = document.createElement( "input" ),
		select = document.createElement( "select" ),
		opt = select.appendChild( document.createElement( "option" ) );

	input.type = "checkbox";

	// Support: Android<4.4
	// Default value for a checkbox should be "on"
	support.checkOn = input.value !== "";

	// Support: IE<=11+
	// Must access selectedIndex to make default options select
	support.optSelected = opt.selected;

	// Support: Android<=2.3
	// Options inside disabled selects are incorrectly marked as disabled
	select.disabled = true;
	support.optDisabled = !opt.disabled;

	// Support: IE<=11+
	// An input loses its value after becoming a radio
	input = document.createElement( "input" );
	input.value = "t";
	input.type = "radio";
	support.radioValue = input.value === "t";
})();


var boolHook,
	attrHandle = jQuery.expr.attrHandle;

jQuery.fn.extend({
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each(function() {
			jQuery.removeAttr( this, name );
		});
	}
});

jQuery.extend({
	attr: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set attributes on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === "undefined" ) {
			return jQuery.prop( elem, name, value );
		}

		// All attributes are lowercase
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			name = name.toLowerCase();
			hooks = jQuery.attrHooks[ name ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : undefined );
		}

		if ( value !== undefined ) {
			if ( value === null ) {
				jQuery.removeAttr( elem, name );
				return;
			}

			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			elem.setAttribute( name, value + "" );
			return value;
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		ret = jQuery.find.attr( elem, name );

		// Non-existent attributes return null, we normalize to undefined
		return ret == null ? undefined : ret;
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" &&
					jQuery.nodeName( elem, "input" ) ) {
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	},

	removeAttr: function( elem, value ) {
		var name, propName,
			i = 0,
			attrNames = value && value.match( rnotwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( ( name = attrNames[i++] ) ) {
				propName = jQuery.propFix[ name ] || name;

				// Boolean attributes get special treatment (#10870)
				if ( jQuery.expr.match.bool.test( name ) ) {

					// Set corresponding property to false
					elem[ propName ] = false;
				}

				elem.removeAttribute( name );
			}
		}
	}
});

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {
			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			elem.setAttribute( name, name );
		}
		return name;
	}
};
jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = function( elem, name, isXML ) {
		var ret, handle;
		if ( !isXML ) {
			// Avoid an infinite loop by temporarily removing this function from the getter
			handle = attrHandle[ name ];
			attrHandle[ name ] = ret;
			ret = getter( elem, name, isXML ) != null ?
				name.toLowerCase() :
				null;
			attrHandle[ name ] = handle;
		}
		return ret;
	};
});




var rfocusable = /^(?:input|select|textarea|button)$/i;

jQuery.fn.extend({
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		return this.each(function() {
			delete this[ jQuery.propFix[ name ] || name ];
		});
	}
});

jQuery.extend({
	prop: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set properties on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {

			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			return ( elem[ name ] = value );
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		return elem[ name ];
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {
				return elem.hasAttribute( "tabindex" ) ||
					rfocusable.test( elem.nodeName ) || elem.href ?
						elem.tabIndex :
						-1;
			}
		}
	},

	propFix: {
		"for": "htmlFor",
		"class": "className"
	}
});

if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {
			var parent = elem.parentNode;
			if ( parent && parent.parentNode ) {
				parent.parentNode.selectedIndex;
			}
			return null;
		}
	};
}

jQuery.each([
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
});




var rclass = /[\t\r\n\f]/g;

function getClass( elem ) {
	return elem.getAttribute && elem.getAttribute( "class" ) || "";
}

jQuery.fn.extend({
	addClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			proceed = typeof value === "string" && value,
			i = 0,
			len = this.length;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).addClass( value.call( this, j, getClass( this ) ) );
			});
		}

		if ( proceed ) {
			// The disjunction here is for better compressibility (see removeClass)
			classes = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				curValue = getClass( elem );
				cur = elem.nodeType === 1 &&
					( " " + curValue + " " ).replace( rclass, " " );

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// only assign if different to avoid unneeded rendering.
					finalValue = jQuery.trim( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			proceed = arguments.length === 0 || typeof value === "string" && value,
			i = 0,
			len = this.length;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).removeClass( value.call( this, j, getClass( this ) ) );
			});
		}
		if ( proceed ) {
			classes = ( value || "" ).match( rnotwhite ) || [];

			for ( ; i < len; i++ ) {
				elem = this[ i ];
				curValue = getClass( elem );

				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 &&
					( " " + curValue + " " ).replace( rclass, " " );

				if ( cur ) {
					j = 0;
					while ( (clazz = classes[j++]) ) {
						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = value ? jQuery.trim( cur ) : "";
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value;

		if ( typeof stateVal === "boolean" && type === "string" ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( i ) {
				jQuery( this ).toggleClass(
					value.call( this, i, getClass( this ), stateVal ),
					stateVal
				);
			});
		}

		return this.each(function() {
			var className, i, self, classNames;

			if ( type === "string" ) {

				// Toggle individual class names
				i = 0;
				self = jQuery( this );
				classNames = value.match( rnotwhite ) || [];

				while ( ( className = classNames[ i++ ] ) ) {

					// Check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( value === undefined || type === "boolean" ) {
				className = getClass( this );
				if ( className ) {

					// store className if set
					dataPriv.set( this, "__className__", className );
				}

				// If the element has a class name or if we're passed `false`,
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				if ( this.setAttribute ) {
					this.setAttribute( "class",
						className || value === false ?
						"" :
						dataPriv.get( this, "__className__" ) || ""
					);
				}
			}
		});
	},

	hasClass: function( selector ) {
		var className = " " + selector + " ",
			i = 0,
			l = this.length;
		for ( ; i < l; i++ ) {
			if ( this[i].nodeType === 1 &&
				( " " + getClass( this[i] ) + " " ).replace( rclass, " " )
					.indexOf( className ) > -1
			) {
				return true;
			}
		}

		return false;
	}
});




var rreturn = /\r/g;

jQuery.fn.extend({
	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[0];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] ||
					jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
					return ret;
				}

				ret = elem.value;

				return typeof ret === "string" ?
					// Handle most common string cases
					ret.replace(rreturn, "") :
					// Handle cases where value is null/undef or number
					ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each(function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";

			} else if ( typeof val === "number" ) {
				val += "";

			} else if ( jQuery.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				});
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		});
	}
});

jQuery.extend({
	valHooks: {
		option: {
			get: function( elem ) {
				// Support: IE<11
				// option.value not trimmed (#14858)
				return jQuery.trim( elem.value );
			}
		},
		select: {
			get: function( elem ) {
				var value, option,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one" || index < 0,
					values = one ? null : [],
					max = one ? index + 1 : options.length,
					i = index < 0 ?
						max :
						one ? index : 0;

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// IE8-9 doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&
							// Don't return options that are disabled or in a disabled optgroup
							( support.optDisabled ?
								!option.disabled : option.getAttribute( "disabled" ) === null ) &&
							( !option.parentNode.disabled ||
								!jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];
					if ( (option.selected =
							jQuery.inArray( jQuery.valHooks.option.get( option ), values ) > -1) ) {
						optionSet = true;
					}
				}

				// Force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	}
});

// Radios and checkboxes getter/setter
jQuery.each([ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( jQuery.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery(elem).val(), value ) > -1 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			return elem.getAttribute("value") === null ? "on" : elem.value;
		};
	}
});




// Return jQuery for attributes-only inclusion


jQuery.each( ("blur focus focusin focusout resize scroll click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup contextmenu").split(" "),
	function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};
});

jQuery.fn.extend({
	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	},

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {
		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ?
			this.off( selector, "**" ) :
			this.off( types, selector || "**", fn );
	}
});




var r20 = /%20/g,
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( jQuery.isArray( obj ) ) {
		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {
				// Treat each array item as a scalar.
				add( prefix, v );

			} else {
				// Item is non-scalar (array or object), encode its numeric index.
				buildParams(
					prefix + "[" + ( typeof v === "object" ? i : "" ) + "]",
					v,
					traditional,
					add
				);
			}
		});

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {
		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {
		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, value ) {
			// If value is a function, invoke it and return its value
			value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
			s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
		};

	// Set traditional to true for jQuery <= 1.3.2 behavior.
	if ( traditional === undefined ) {
		traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		});

	} else {
		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" ).replace( r20, "+" );
};

jQuery.fn.extend({
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map(function() {
			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		})
		.filter(function() {
			var type = this.type;

			// Use .is( ":disabled" ) so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		})
		.map(function( i, elem ) {
			var val = jQuery( this ).val();

			return val == null ?
				null :
				jQuery.isArray( val ) ?
					jQuery.map( val, function( val ) {
						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
					}) :
					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		}).get();
	}
});


support.createHTMLDocument = (function() {
	var body = document.implementation.createHTMLDocument( "" ).body;
	body.innerHTML = "<form></form><form></form>";
	return body.childNodes.length === 2;
})();


// data: string of html
// context (optional): If specified, the fragment will be created in this context,
// defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( typeof data !== "string" ) {
		return [];
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}
	// document.implementation stops scripts or inline event handlers from
	// being executed immediately
	context = context || ( support.createHTMLDocument ?
		document.implementation.createHTMLDocument( "" ) :
		document );

	var parsed = rsingleTag.exec( data ),
		scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[1] ) ];
	}

	parsed = buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.

// Note that for maximum portability, libraries that are not jQuery should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. jQuery is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	});
}



var
	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in AMD
// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( !noGlobal ) {
	window.jQuery = window.$ = jQuery;
}

return jQuery;
}));

});

require.register("widget/pop", function(exports, require, module) {
var Fields, FormatterFactory, Helper, jQuery;

Fields = require('widget/fields');

Helper = require('widget/pop/helper');

jQuery = require('widget/lib/jquery');

FormatterFactory = require('widget/pop/formatters/factory');

module.exports = {
  topPop: void 0,
  custom: ['woocommerce'],
  create: function(args) {
    var c, custom, field, fields, mappedField, newValue, o, post, pre, _i, _j, _k, _len, _len1, _len2, _ref, _ref1;
    this.args = args;
    fields = [];
    if (this.args.mappedFields.fields == null) {
      return fields;
    }
    _ref = this.args.mappedFields.fields;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      mappedField = _ref[_i];
      if (field = this._findField(mappedField.pop_id)) {
        jQuery.extend(field, mappedField);
        if (newValue = this._newValue(mappedField)) {
          field.mapping = mappedField.params.slice();
          field.newValue = newValue;
          fields.push(field);
        }
      }
    }
    pre = null;
    post = null;
    custom = null;
    _ref1 = this.custom;
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      c = _ref1[_j];
      o = require("widget/pop/custom/" + c);
      if (o.detect(this.args)) {
        custom = o.create(fields);
        pre = custom.preFill;
        post = custom.postFill;
      }
    }
    if (pre) {
      pre.call(custom, this);
    }
    for (_k = 0, _len2 = fields.length; _k < _len2; _k++) {
      field = fields[_k];
      this._popField(field);
    }
    if (post) {
      post.call(custom, this);
    }
    return {
      fields: Fields.fields
    };
  },
  _findField: function(pop_id) {
    var field, _i, _len, _ref;
    if (Fields.fields == null) {
      return;
    }
    _ref = Fields.fields;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      field = _ref[_i];
      if (field.popID() === pop_id.toString()) {
        if (field.ignore()) {
          return;
        } else {
          return field;
        }
      }
    }
  },
  _newValue: function(mappedField) {
    var formatter;
    formatter = FormatterFactory.build(mappedField.type);
    return formatter.process(mappedField, this.args.popData);
  },
  _popField: function(field, reload) {
    var helper;
    if (reload == null) {
      reload = false;
    }
    helper = Helper.run(field, reload);
    if (helper.filled) {
      console.log("Setting filled", helper);
      if (!field.el.classList.contains('pop-field')) {
        field.el.classList.add('pop-field');
      }
      field.el.classList.add('pop-filled');
      field.el.classList.add('pop-highlight');
      console.log(field.el.className);
      window.setTimeout(function() {
        return field.el.classList.remove('pop-highlight');
      }, 2000);
    }
    return field.helper;
  }
};

});

require.register("widget/pop/custom/base", function(exports, require, module) {
var Base;

module.exports = Base = (function() {
  function Base(fields) {
    this.fields = fields;
  }

  return Base;

})();

});

require.register("widget/pop/custom/woocommerce", function(exports, require, module) {
var Base, WooCommerce, jQuery,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Base = require('widget/pop/custom/base');

jQuery = require('widget/lib/jquery');

module.exports = WooCommerce = (function(_super) {
  __extends(WooCommerce, _super);

  WooCommerce.create = function(fields) {
    return new WooCommerce(fields);
  };

  WooCommerce.detect = function() {
    return jQuery('body').hasClass('woocommerce-checkout');
  };

  function WooCommerce(fields) {
    this.params = ["CreditCards.CreditCard.Number", "CreditCards.CreditCard.CCV", "CreditCards.CreditCard.Expiry", "CreditCards.CreditCard.Expiry.Month", "CreditCards.CreditCard.Expiry.Year"];
    WooCommerce.__super__.constructor.call(this, fields);
  }

  WooCommerce.prototype.preFill = function(pop) {};

  WooCommerce.prototype.postFill = function(pop) {
    var _this = this;
    return setTimeout(function() {
      var field, _i, _len, _ref, _results;
      _ref = _this.fields;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        field = _ref[_i];
        if (_this.popExpiry(field)) {
          _results.push(pop._popField(field, true));
        } else if (field.mapping.length > 0) {
          if (_this.params.indexOf(field.mapping[0]) > -1) {
            _results.push(pop._popField(field, true));
          } else {
            _results.push(void 0);
          }
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    }, 5000);
  };

  WooCommerce.prototype.popExpiry = function(field) {
    var vals;
    if (field.mapping.length === 2 && field.mapping[0] === "CreditCards.CreditCard.Expiry.Month" && field.mapping[1] === "CreditCards.CreditCard.Expiry.Year") {
      vals = field.newValue.split(' ');
      if (vals.length === 2) {
        field.newValue = vals[0];
        field.newValue += '/';
        field.newValue += vals[1][2];
        field.newValue += vals[1][3];
        return true;
      }
      return false;
    }
  };

  return WooCommerce;

})(Base);

});

require.register("widget/pop/formatters/address", function(exports, require, module) {
var Address;

module.exports = Address = (function() {
  function Address() {}

  Address.process = function(field, payload) {
    var numberAndUnit, params, streetName, streetNumber, streetType, unitNumber;
    params = this.parse(field.params);
    unitNumber = payload[params.UnitNumber];
    streetNumber = payload[params.StreetNumber];
    streetName = payload[params.StreetName] || '';
    streetType = payload[params.StreetType] || '';
    numberAndUnit = '';
    if (unitNumber && streetNumber) {
      numberAndUnit = [unitNumber, streetNumber].join(" / ");
    } else {
      numberAndUnit = streetNumber || unitNumber || '';
    }
    return ("" + numberAndUnit + " " + streetName + " " + streetType).trim();
  };

  Address.parse = function(params) {
    var param, result, _fn, _i, _len;
    result = {};
    _fn = function(param) {
      return result[param.split('.').pop()] = param;
    };
    for (_i = 0, _len = params.length; _i < _len; _i++) {
      param = params[_i];
      _fn(param);
    }
    return result;
  };

  return Address;

})();

});

require.register("widget/pop/formatters/date", function(exports, require, module) {
var DateFormatter;

module.exports = DateFormatter = (function() {
  function DateFormatter() {}

  DateFormatter.process = function(field, payload) {
    var dateFormat, dt, value;
    dateFormat = this.findDateFormat(field.placeholder) || this.findDateFormat(field.label) || ["dd-mm-yyyy", "dd", "-", "mm", "-", "yyyy"];
    value = this.value(field, payload);
    dt = this.parsePayloadDate(value);
    return this.formatDate(dt, dateFormat);
  };

  DateFormatter.value = function(field, payload) {
    var param, res, _i, _len, _ref;
    res = [];
    _ref = field.params;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      param = _ref[_i];
      res.push(payload[param]);
    }
    return res.join('-');
  };

  DateFormatter.findDateFormat = function(text) {
    var datePattern;
    if (!text) {
      return null;
    }
    datePattern = /(d{1,2}|m{1,2}|y{2,4})([\s-\/])(d{1,2}|m{1,2})([\s-\/])(d{1,2}|m{1,2}|y{2,4})/i;
    return text.match(datePattern);
  };

  DateFormatter.formatDate = function(dt, dateFormat) {
    var result;
    result = this.getPart(dt, dateFormat[1]);
    result += dateFormat[2];
    result += this.getPart(dt, dateFormat[3]);
    result += dateFormat[4];
    result += this.getPart(dt, dateFormat[5]);
    return result;
  };

  DateFormatter.getPart = function(dt, partSpecifier) {
    var javaSucks;
    javaSucks = 100;
    switch (partSpecifier.toLowerCase()) {
      case "d":
        return dt.getDate().toString();
      case "dd":
        return this.twoDigits(dt.getDate());
      case "m":
        return (dt.getMonth() + 1).toString();
      case "mm":
        return this.twoDigits(dt.getMonth() + 1);
      case "yy":
        return (dt.getFullYear() % javaSucks).toString();
      case "yyyy":
        return dt.getFullYear().toString();
    }
  };

  DateFormatter.twoDigits = function(i) {
    var result;
    result = i.toString();
    if (result.length === 1) {
      return "0" + result;
    } else {
      return result;
    }
  };

  DateFormatter.parsePayloadDate = function(s) {
    return new Date(s.slice(6, 10), parseInt(s.slice(3, 5)) - 1, s.slice(0, 2));
  };

  return DateFormatter;

})();

});

require.register("widget/pop/formatters/default", function(exports, require, module) {
var Default;

module.exports = Default = (function() {
  function Default() {}

  Default.process = function(field, payload) {
    var v, val, _i, _len, _ref;
    v = [];
    _ref = field.params;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      val = _ref[_i];
      if (val.indexOf('NickName') > -1) {
        continue;
      }
      if (!!payload[val]) {
        if (typeof payload[val] === 'string') {
          v.push(payload[val].trim());
        } else {
          v.push(payload[val]);
        }
      }
    }
    return v.join(' ').trim();
  };

  return Default;

})();

});

require.register("widget/pop/formatters/factory", function(exports, require, module) {
var Address, Date, Default, FormatterFactory, MonthYear, Phone, formatters;

formatters = [Address = require('widget/pop/formatters/address'), Phone = require('widget/pop/formatters/phone'), Date = require('widget/pop/formatters/date'), MonthYear = require('widget/pop/formatters/monthyear'), Default = require('widget/pop/formatters/default')];

module.exports = FormatterFactory = (function() {
  function FormatterFactory() {}

  FormatterFactory.build = function(type) {
    switch (type) {
      case 'Address':
      case 'CurrentResidency':
      case 'PreviousResidency':
      case 'PostalAddress':
        return Address;
      case 'TelephoneNumber':
      case 'CellPhoneNumber':
      case 'FaxNumber':
        return Phone;
      case 'Date':
        return Date;
      case 'MonthYear':
        return MonthYear;
      default:
        return Default;
    }
  };

  return FormatterFactory;

})();

});

require.register("widget/pop/formatters/monthyear", function(exports, require, module) {
var DateFormatter, MonthYearFormatter;

DateFormatter = require('./date');

module.exports = MonthYearFormatter = (function() {
  function MonthYearFormatter() {}

  MonthYearFormatter.process = function(field, payload) {
    var dateFormat, dt, value;
    dateFormat = this.findMonthYearFormat(field.placeholder) || this.findMonthYearFormat(field.label) || ["mm-yyyy", "mm", "-", "yyyy"];
    console.log('dateFormat', dateFormat);
    value = DateFormatter.value(field, payload);
    dt = this.parsePayloadMonthYear(value);
    return this.formatMonthYear(dt, dateFormat);
  };

  MonthYearFormatter.findMonthYearFormat = function(text) {
    var datePattern;
    if (!text) {
      return null;
    }
    datePattern = /(m{1,2}|y{2,4})([\s-\/]+)(m{1,2}|y{2,4})/i;
    return text.match(datePattern);
  };

  MonthYearFormatter.formatMonthYear = function(dt, dateFormat) {
    var result;
    result = DateFormatter.getPart(dt, dateFormat[1]);
    result += dateFormat[2];
    result += DateFormatter.getPart(dt, dateFormat[3]);
    return result;
  };

  MonthYearFormatter.parsePayloadMonthYear = function(s) {
    return new Date(s.slice(3, 7), parseInt(s.slice(0, 2)) - 1, 1);
  };

  return MonthYearFormatter;

})();

});

require.register("widget/pop/formatters/phone", function(exports, require, module) {
var Phone;

module.exports = Phone = (function() {
  function Phone() {}

  Phone.process = function(field, payload) {
    var areaCode, countryCode, extension, number, params;
    params = this.parse(field.params);
    countryCode = payload[params.CountryCode] || '';
    areaCode = payload[params.AreaCode] || '';
    number = payload[params.Number] || '';
    extension = payload[params.Extension] || '';
    return ("" + countryCode + areaCode + number + extension).replace(/\s/g, '');
  };

  Phone.parse = function(params) {
    var param, result, _fn, _i, _len;
    result = {};
    _fn = function(param) {
      return result[param.split('.').pop()] = param;
    };
    for (_i = 0, _len = params.length; _i < _len; _i++) {
      param = params[_i];
      _fn(param);
    }
    return result;
  };

  return Phone;

})();

});

require.register("widget/pop/helper", function(exports, require, module) {
/*
TextField = require 'widget/pop/helpers/text'
RadioField = require 'widget/pop/helpers/radio'
SelectField = require 'widget/pop/helpers/select'
CountryCodeSelectField = require 'widget/pop/helpers/country_code_select'
CheckboxField = require 'widget/pop/helpers/checkbox'
NumberField = require 'widget/pop/helpers/number'
StateSelectField = require 'widget/pop/helpers/state_select'
*/

var DefaultHelper, FieldPopHelper, fields;

fields = [require('widget/pop/helpers/jqselect_box'), require('widget/pop/helpers/month_select'), require('widget/pop/helpers/country_code_select'), require('widget/pop/helpers/country_select'), require('widget/pop/helpers/state_select'), require('widget/pop/helpers/select'), require('widget/pop/helpers/two_digits'), require('widget/pop/helpers/number'), require('widget/pop/helpers/text'), require('widget/pop/helpers/radio'), require('widget/pop/helpers/checkbox')];

DefaultHelper = require('widget/pop/helpers/text');

module.exports = FieldPopHelper = (function() {
  function FieldPopHelper(field, reload) {
    this.field = field;
    this.reload = reload != null ? reload : false;
  }

  FieldPopHelper.factory = function(field, reload) {
    var helper, obj;
    if (reload == null) {
      reload = false;
    }
    obj = new FieldPopHelper(field, reload);
    if (helper = obj.createHelper()) {
      if (reload) {
        helper.reload();
      }
      return helper;
    }
  };

  FieldPopHelper.run = function(field, reload) {
    var helper, obj;
    if (reload == null) {
      reload = false;
    }
    obj = new FieldPopHelper(field, reload);
    if (helper = obj.createHelper()) {
      if (reload) {
        helper.reload();
      }
      helper.fill(field.newValue);
      helper.doChange(field.el);
      return helper;
    }
  };

  FieldPopHelper.prototype.createHelper = function() {
    var Field, _Field, _i, _len;
    for (_i = 0, _len = fields.length; _i < _len; _i++) {
      _Field = fields[_i];
      if (_Field.detect(this.field)) {
        Field = _Field;
        break;
      }
    }
    if (Field) {
      return new Field(this.field);
    }
    return new DefaultHelper(this.field);
  };

  FieldPopHelper.prototype.tagName = function() {
    var _ref;
    return (_ref = this.field.metadata) != null ? _ref.tag_name : void 0;
  };

  FieldPopHelper.prototype.tagType = function() {
    var _ref, _ref1;
    return ((_ref = this.field.el) != null ? (_ref1 = _ref.type) != null ? _ref1.toLowerCase() : void 0 : void 0) || 'text';
  };

  return FieldPopHelper;

})();

});

require.register("widget/pop/helpers/base", function(exports, require, module) {
var BaseField, IsVisible, Preferences, jQuery;

Preferences = require('widget/config/preferences');

IsVisible = require('widget/lib/isvisible');

jQuery = require('widget/lib/jquery');

module.exports = BaseField = (function() {
  var levDist, val;

  BaseField.prototype.rmonthSelect = /(mth|mnth|month)/i;

  BaseField.allStyles = (function() {
    var _i, _len, _ref, _results;
    _ref = ['assumed', 'none', 'exact'];
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      val = _ref[_i];
      _results.push("" + Preferences.page.cssPrefix + "-" + val);
    }
    return _results;
  })();

  BaseField.detect = function(field) {
    return false;
  };

  function BaseField(field) {
    this.field = field;
    this.value = void 0;
    this.initialValue = this.field.el.value;
    this.poppedValue = void 0;
  }

  BaseField.prototype.fill = function(value) {
    this.value = value;
    this.poppedValue = this.value;
    this._applySlice();
    return console.log("Visible", this.visible(), this.field.el.id, this.field.el.name);
  };

  BaseField.prototype._applySlice = function() {
    var end, start, _ref;
    if (this.field.slice != null) {
      _ref = this.field.slice, start = _ref[0], end = _ref[1];
      this.value = this.value.slice(start, end);
      return console.log("Sliced", this.value);
    }
  };

  BaseField.prototype.changed = function() {
    return this.initialValue !== this.value;
  };

  BaseField.prototype.revert = function() {
    return this.field.el.value = this.initialValue;
  };

  BaseField.prototype.reload = function() {
    var els;
    if (!!this.field.el.id) {
      this.field.el = document.getElementById(this.field.el.id);
      return true;
    }
    if (!!this.field.el.name) {
      els = document.getElementsByName(this.field.el.name);
      if (els.length > 0) {
        this.field.el = els[0];
        return true;
      }
    }
  };

  BaseField.prototype.doChange = function(el) {
    var evtA, evtB, _ref, _ref1;
    evtA = document.createEvent('HTMLEvents');
    evtA.initEvent('change', true, true);
    if (((_ref = this.field.el) != null ? _ref.dispatchEvent : void 0) != null) {
      this.field.el.dispatchEvent(evtA);
    }
    if (Preferences.browserType === 'Fennec') {
      return console.log("Skipping click event because Fennec");
    } else {
      evtB = document.createEvent('HTMLEvents');
      evtB.initEvent('click', true, true);
      if (((_ref1 = this.field.el) != null ? _ref1.dispatchEvent : void 0) != null) {
        return this.field.el.dispatchEvent(evtB);
      }
    }
  };

  BaseField.prototype.visible = function() {
    return this.field.el.isVisible();
  };

  levDist = function(s, t) {
    var b, c, cost, d, i, j, m, mi, n, s_i, t_j;
    d = [];
    n = s.length;
    m = t.length;
    if (n === 0) {
      return m;
    }
    if (m === 0) {
      return n;
    }
    i = n;
    while (i >= 0) {
      d[i] = [];
      i--;
    }
    i = n;
    while (i >= 0) {
      d[i][0] = i;
      i--;
    }
    j = m;
    while (j >= 0) {
      d[0][j] = j;
      j--;
    }
    i = 1;
    while (i <= n) {
      s_i = s.charAt(i - 1);
      j = 1;
      while (j <= m) {
        if (i === j && d[i][j] > 4) {
          return n;
        }
        t_j = t.charAt(j - 1);
        cost = (s_i === t_j ? 0 : 1);
        mi = d[i - 1][j] + 1;
        b = d[i][j - 1] + 1;
        c = d[i - 1][j - 1] + cost;
        if (b < mi) {
          mi = b;
        }
        if (c < mi) {
          mi = c;
        }
        d[i][j] = mi;
        if (i > 1 && j > 1 && s_i === t.charAt(j - 2) && s.charAt(i - 2) === t_j) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
        }
        j++;
      }
      i++;
    }
    return d[n][m];
  };

  return BaseField;

})();

});

require.register("widget/pop/helpers/checkbox", function(exports, require, module) {
var BaseField, CheckboxField,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseField = require('widget/pop/helpers/base');

module.exports = CheckboxField = (function(_super) {
  __extends(CheckboxField, _super);

  function CheckboxField(field) {
    CheckboxField.__super__.constructor.call(this, field);
  }

  CheckboxField.detect = function(field) {
    return field.el.tagName === 'INPUT' && field.el.type === 'checkbox';
  };

  CheckboxField.prototype.fill = function(value) {
    var result, strategy, _i, _len, _ref, _results;
    CheckboxField.__super__.fill.call(this, value);
    if (this._validate(this.value)) {
      _ref = this._strategies;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        strategy = _ref[_i];
        if (result = this[strategy](this.value)) {
          this.filled = true;
          break;
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    }
  };

  CheckboxField.prototype._validate = function(value) {
    if (typeof value !== 'string') {
      return false;
    }
    return true;
  };

  CheckboxField.prototype._strategies = ['_exactStrategy', '_fuzzyValueStrategy', '_fuzzyLabelStrategy'];

  CheckboxField.prototype._exactStrategy = function(value) {
    if (this.field.el.value.toLowerCase() === value.toLowerCase()) {
      return this._assign();
    }
    return false;
  };

  CheckboxField.prototype._fuzzyValueStrategy = function(value) {
    var r;
    if (r = this._match(value, [this.field.el.value])) {
      return this._assign();
    }
    return false;
  };

  CheckboxField.prototype._fuzzyLabelStrategy = function(value) {
    if (this._match(value, [this.field.metadata.label])) {
      return this._assign();
    }
    return false;
  };

  CheckboxField.prototype._match = function(needle, haystack) {
    var fs;
    fs = FuzzySet(haystack, false).get(needle);
    if ((fs != null) && fs.length > 0 && fs[0].length === 2) {
      return fs[0][0] >= 0.2;
    }
  };

  CheckboxField.prototype._assign = function() {
    return this.field.el.checked = true;
  };

  return CheckboxField;

})(BaseField);

});

require.register("widget/pop/helpers/compound", function(exports, require, module) {


});

;require.register("widget/pop/helpers/country_code_select", function(exports, require, module) {
var BaseField, Countries, CountryCodeSelectField, FuzzySet,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

FuzzySet = require('widget/lib/fuzzyset');

BaseField = require('widget/pop/helpers/base');

Countries = require('widget/lib/countries');

module.exports = CountryCodeSelectField = (function(_super) {
  __extends(CountryCodeSelectField, _super);

  CountryCodeSelectField.detect = function(el) {
    var checks, option, options, param, vals, _i, _len;
    if (el.mapping && el.mapping.length !== 1) {
      return false;
    }
    param = el.mapping.slice().shift().split('.').pop();
    if (param !== 'CountryCode') {
      return false;
    }
    options = el.el.children;
    vals = [];
    checks = ['AU', 'US', 'GB'];
    for (_i = 0, _len = options.length; _i < _len; _i++) {
      option = options[_i];
      vals.push(option.value);
    }
    return checks.every(function(v, i) {
      return vals.indexOf(v) !== -1;
    });
  };

  function CountryCodeSelectField(field) {
    CountryCodeSelectField.__super__.constructor.call(this, field);
    this.options = this.field.el.children;
  }

  CountryCodeSelectField.prototype.fill = function(value) {
    var c, i, _results;
    CountryCodeSelectField.__super__.fill.call(this, value);
    if (this._validate(this.value)) {
      _results = [];
      for (i in Countries) {
        c = Countries[i];
        if (c.callingCode === this.value.toString()) {
          this.field.el.value = c.cca2;
          _results.push(this.filled = true);
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    }
  };

  CountryCodeSelectField.prototype._validate = function(value) {
    if (typeof value !== 'string') {
      return false;
    }
    if (this.options.length === 0) {
      return false;
    }
    return true;
  };

  return CountryCodeSelectField;

})(BaseField);

});

require.register("widget/pop/helpers/country_select", function(exports, require, module) {
var COUNTRY_REGEX, Countries, CountrySelect, FuzzySet, SelectField,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

FuzzySet = require('widget/lib/fuzzyset');

SelectField = require('widget/pop/helpers/select');

Countries = require('widget/lib/countries');

COUNTRY_REGEX = /Country$/;

module.exports = CountrySelect = (function(_super) {
  __extends(CountrySelect, _super);

  CountrySelect.detect = function(el) {
    return SelectField.detect(el) && CountrySelect._detect(el);
  };

  CountrySelect._detect = function(el) {
    var param;
    if (el.mapping && el.mapping.length !== 1) {
      return false;
    }
    param = el.mapping.slice().shift().split('.').pop();
    return COUNTRY_REGEX.test(param);
  };

  function CountrySelect(field) {
    var country, o, option, selections;
    CountrySelect.__super__.constructor.call(this, field);
    this.options = this.field.el.children;
    this.optionValues = (function() {
      var _i, _len, _ref, _ref1, _results;
      _ref = this.options;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        country = (_ref1 = Countries.filter(function(o) {
          var as, _ref2, _ref3;
          return o.name.toLowerCase() === (option != null ? (_ref2 = option.value) != null ? _ref2.toLowerCase() : void 0 : void 0) || ~((function() {
            var _j, _len1, _ref4, _results1;
            _ref4 = o.altSpellings;
            _results1 = [];
            for (_j = 0, _len1 = _ref4.length; _j < _len1; _j++) {
              as = _ref4[_j];
              _results1.push(as.toLowerCase());
            }
            return _results1;
          })()).indexOf(option != null ? (_ref3 = option.value) != null ? _ref3.toLowerCase() : void 0 : void 0);
        })) != null ? _ref1.shift() : void 0;
        if (country != null) {
          selections = [].concat.apply([], [country.name, option.value].concat([country.altSpellings]));
          _results.push([
            option.value, (function() {
              var _j, _len1, _results1;
              _results1 = [];
              for (_j = 0, _len1 = selections.length; _j < _len1; _j++) {
                o = selections[_j];
                _results1.push(o.toLowerCase());
              }
              return _results1;
            })()
          ]);
        } else {
          _results.push([option.value, [option.value]]);
        }
      }
      return _results;
    }).call(this);
  }

  CountrySelect.prototype.fill = function(value) {
    var c, i, _ref;
    if (this._validate(value)) {
      _ref = this.optionValues;
      for (i in _ref) {
        c = _ref[i];
        if ((c[1] != null) && ~c[1].indexOf(value.toString().toLowerCase())) {
          this.field.el.value = c[0];
          this.filled = true;
          return;
        }
      }
      return CountrySelect.__super__.fill.call(this, value);
    }
  };

  CountrySelect.prototype._validate = function(value) {
    if (typeof value !== 'string') {
      return false;
    }
    if (this.options.length === 0) {
      return false;
    }
    return true;
  };

  return CountrySelect;

})(SelectField);

});

require.register("widget/pop/helpers/jqselect_box", function(exports, require, module) {
var JQSelectBoxField, SelectField, jQuery,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

SelectField = require('widget/pop/helpers/select');

jQuery = require('widget/lib/jquery');

module.exports = JQSelectBoxField = (function(_super) {
  __extends(JQSelectBoxField, _super);

  JQSelectBoxField.detect = function(el) {
    return SelectField.detect(el) && this._detect(el);
  };

  JQSelectBoxField._detect = function(el) {
    return el.el.hasAttribute('sb');
  };

  function JQSelectBoxField(field) {
    JQSelectBoxField.__super__.constructor.call(this, field);
  }

  JQSelectBoxField.prototype.fill = function(value) {
    var el, evt, newVal, sbId;
    JQSelectBoxField.__super__.fill.call(this, value);
    newVal = jQuery(this.field.el).val();
    sbId = '#sbOptions_' + this.field.el.getAttribute('sb');
    el = jQuery("" + sbId + " a[rel=" + newVal + "]");
    evt = document.createEvent('HTMLEvents');
    evt.initEvent('click', true, true);
    if (el.length > 0) {
      el[0].dispatchEvent(evt);
    }
  };

  return JQSelectBoxField;

})(SelectField);

});

require.register("widget/pop/helpers/month_select", function(exports, require, module) {
var BaseField, MonthSelectField,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

BaseField = require('widget/pop/helpers/base');

module.exports = MonthSelectField = (function(_super) {
  __extends(MonthSelectField, _super);

  function MonthSelectField(field) {
    MonthSelectField.__super__.constructor.call(this, field);
    this.options = this.field.el.children;
  }

  MonthSelectField.detect = function(field) {
    var first, januaries, param, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
    januaries = ['january', 'januarie', 'januar', 'januari', '一月'];
    if ((field != null ? (_ref = field.el) != null ? _ref.options : void 0 : void 0) == null) {
      return false;
    }
    if ((field != null ? (_ref1 = field.el) != null ? _ref1.tagName : void 0 : void 0) !== 'SELECT') {
      return false;
    }
    if ((field != null ? (_ref2 = field.el) != null ? (_ref3 = _ref2.options) != null ? _ref3.length : void 0 : void 0 : void 0) !== 13) {
      return false;
    }
    param = field.mapping.shift().split('.').pop();
    if (param !== 'Month') {
      return false;
    }
    first = (_ref4 = field.el.options[1].innerText) != null ? _ref4.trim() : void 0;
    if (_ref5 = first != null ? first.toLowerCase() : void 0, __indexOf.call(januaries, _ref5) < 0) {
      return false;
    }
    return true;
  };

  MonthSelectField.prototype.fill = function(value) {
    MonthSelectField.__super__.fill.call(this, value);
    value = parseInt(value);
    if (isNaN(value)) {
      this.filled = false;
      return;
    }
    this.field.el.selectedIndex = value;
    this.filled = true;
    this.matchType = 'exact';
    return true;
  };

  return MonthSelectField;

})(BaseField);

});

require.register("widget/pop/helpers/number", function(exports, require, module) {
var NumberField, TextField,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

TextField = require('widget/pop/helpers/text');

module.exports = NumberField = (function(_super) {
  __extends(NumberField, _super);

  function NumberField(element) {
    NumberField.__super__.constructor.call(this, element);
  }

  NumberField.detect = function(field) {
    var _ref;
    return field.el.tagName === 'INPUT' && ((_ref = field.el.type) === 'number' || _ref === 'tel');
  };

  NumberField.prototype.fill = function(value) {
    return NumberField.__super__.fill.call(this, value != null ? value.replace(/\D[.]/g, '') : void 0);
  };

  return NumberField;

})(TextField);

});

require.register("widget/pop/helpers/radio", function(exports, require, module) {
var BaseField, Fields, FuzzySet, RadioField,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseField = require('widget/pop/helpers/base');

FuzzySet = require('widget/lib/fuzzyset');

Fields = require('widget/fields');

module.exports = RadioField = (function(_super) {
  __extends(RadioField, _super);

  function RadioField(field) {
    var item;
    RadioField.__super__.constructor.call(this, field);
    this.initialValue = this.field.el.value;
    this.group = this.field.el.form.elements.namedItem(this.field.el.name);
    this.values = (function() {
      var _i, _len, _ref, _results;
      _ref = this.group;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        _results.push(item.value);
      }
      return _results;
    }).call(this);
  }

  RadioField.detect = function(field) {
    return field.el.tagName === 'INPUT' && field.el.type === 'radio';
  };

  RadioField.prototype.fill = function(value) {
    var result, strategy, _i, _len, _ref, _results;
    RadioField.__super__.fill.call(this, value);
    if (this._validate(this.value)) {
      _ref = this._strategies;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        strategy = _ref[_i];
        if (result = this[strategy](this.value)) {
          this.filled = true;
          console.info("Filled with " + strategy, result);
          break;
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    }
  };

  RadioField.prototype._validate = function(value) {
    if (typeof value !== 'string') {
      return false;
    } else {
      return true;
    }
  };

  RadioField.prototype._strategies = ['_exactStrategy', '_fuzzyValueStrategy', '_fuzzyLabelStrategy'];

  RadioField.prototype._exactStrategy = function(value) {
    var val, _i, _len, _ref;
    _ref = this.values;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      val = _ref[_i];
      if (val.toLowerCase() === value.toLowerCase()) {
        return this._assignAndCheck(val);
      }
    }
    return false;
  };

  RadioField.prototype._fuzzyValueStrategy = function(value) {
    var fs;
    fs = FuzzySet(this.values, false).get(value);
    if ((fs != null) && fs.length > 0 && fs[0].length === 2) {
      return this._assignAndCheck(fs[0][1]);
    }
    return false;
  };

  RadioField.prototype._fuzzyLabelStrategy = function(value) {
    var field, fieldsByLabel, fs, ref, _i, _j, _len, _len1, _ref, _ref1;
    fieldsByLabel = {};
    _ref = this.group;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      ref = _ref[_i];
      _ref1 = Fields.fields;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        field = _ref1[_j];
        if (ref === field.el) {
          fieldsByLabel[field.metadata.label] = field;
        }
      }
    }
    fs = FuzzySet(Object.keys(fieldsByLabel), false).get(value);
    if ((fs != null) && fs.length > 0 && fs[0].length === 2) {
      return this._assignAndCheck(fieldsByLabel[fs[0][1]].el.value);
    }
    return false;
  };

  RadioField.prototype._assignAndCheck = function(val) {
    this.group.value = val;
    return this.group.value === val;
  };

  return RadioField;

})(BaseField);

});

require.register("widget/pop/helpers/select", function(exports, require, module) {
var BaseField, FuzzySet, SelectField,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

FuzzySet = require('widget/lib/fuzzyset');

BaseField = require('widget/pop/helpers/base');

module.exports = SelectField = (function(_super) {
  __extends(SelectField, _super);

  SelectField.matchThreshold = 0.3;

  function SelectField(field) {
    SelectField.__super__.constructor.call(this, field);
    this.options = this.field.el.getElementsByTagName('option');
  }

  SelectField.detect = function(field) {
    var _ref;
    return (field != null ? (_ref = field.el) != null ? _ref.tagName : void 0 : void 0) === 'SELECT';
  };

  SelectField.prototype.fill = function(value) {
    var result, strategy, _i, _len, _ref, _results;
    SelectField.__super__.fill.call(this, value);
    if (this._validate(value)) {
      if (this.field.el.value === this.value) {
        return this.filled = true;
      } else {
        _ref = this._strategies;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          strategy = _ref[_i];
          if (result = this[strategy](this.value)) {
            this.filled = true;
            break;
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      }
    }
  };

  SelectField.prototype._validate = function(value) {
    if (typeof value !== 'string') {
      return false;
    }
    if (this.options.length === 0) {
      return false;
    }
    return true;
  };

  SelectField.prototype._strategies = ['_exactStrategy', '_prefixStrategy', '_fuzzyValueStrategy', '_fuzzyTextStrategy'];

  SelectField.prototype._exactStrategy = function(value) {
    var option, v, _i, _len, _ref, _ref1, _ref2;
    _ref = this.options;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      option = _ref[_i];
      v = value.toLowerCase();
      if ((option != null ? (_ref1 = option.value) != null ? _ref1.toLowerCase() : void 0 : void 0) === v) {
        return this.field.el.value = option.value;
      }
      if ((option != null ? (_ref2 = option.text) != null ? _ref2.toLowerCase() : void 0 : void 0) === v) {
        return this.field.el.value = option.value;
      }
    }
  };

  SelectField.prototype._prefixStrategy = function(value) {
    var option, v, _i, _len, _ref, _ref1, _ref2;
    _ref = this.options;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      option = _ref[_i];
      v = value.toLowerCase();
      if ((option != null ? (_ref1 = option.value) != null ? _ref1.toLowerCase().indexOf(v) : void 0 : void 0) === 0) {
        return this.field.el.value = option.value;
      }
      if ((option != null ? (_ref2 = option.text) != null ? _ref2.toLowerCase().indexOf(v) : void 0 : void 0) === 0) {
        return this.field.el.value = option.value;
      }
    }
  };

  SelectField.prototype._fuzzyValueStrategy = function(value) {
    var fs, option, vals;
    vals = (function() {
      var _i, _len, _ref, _results;
      _ref = this.options;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        _results.push(option.value);
      }
      return _results;
    }).call(this);
    fs = FuzzySet(vals, false).get(value);
    if ((fs != null) && fs.length > 0 && fs[0].length === 2) {
      return this.field.el.value = fs[0][1];
    }
  };

  SelectField.prototype._fuzzyTextStrategy = function(value) {
    var fs, option, vals, _i, _len, _ref;
    vals = (function() {
      var _i, _len, _ref, _results;
      _ref = this.options;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        _results.push(option.text);
      }
      return _results;
    }).call(this);
    fs = FuzzySet(vals, false).get(value);
    if ((fs != null) && fs.length > 0 && fs[0].length === 2) {
      _ref = this.options;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        option = _ref[_i];
        if (option.text === fs[0][1]) {
          return this.field.el.value = option.value;
        }
      }
    }
  };

  return SelectField;

})(BaseField);

});

require.register("widget/pop/helpers/state_select", function(exports, require, module) {
var SelectField, StateSelectField,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

SelectField = require('widget/pop/helpers/select');

module.exports = StateSelectField = (function(_super) {
  __extends(StateSelectField, _super);

  function StateSelectField(field) {
    StateSelectField.__super__.constructor.call(this, field);
    this._attachObserver();
  }

  StateSelectField.prototype.fill = function(value) {
    if (this.field.el.tagName.toLowerCase() === 'input') {
      this.field.el.value = value;
      if (this.field.el.value !== this.initialValue || this.field.el.value === value) {
        this.value = value;
        this.filled = true;
        this.matchType = 'exact';
        return;
      }
    }
    return StateSelectField.__super__.fill.call(this, value);
  };

  StateSelectField.prototype._validate = function(value) {
    if (typeof value !== 'string') {
      return false;
    }
    return true;
  };

  StateSelectField.prototype._attachObserver = function() {
    var MAX_FILLS, MutationObserver, blankObserver, config, el, fillCount, observer, target,
      _this = this;
    target = this.field.el.parentNode;
    if ((target == null) || target.length === 0) {
      el = document.getElementsByName(this.field.name);
      if (el.length > 0) {
        this.field.el = el[0];
        this.options = this.field.el.children;
        this.fill(this.field.newValue);
        this.doChange(this.field.el);
      }
      return;
    }
    config = {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true
    };
    MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
    blankObserver = new MutationObserver(function(mutations) {});
    blankObserver.observe(target, config);
    MAX_FILLS = 1;
    fillCount = 0;
    observer = new MutationObserver(function(mutations) {
      if (fillCount < MAX_FILLS) {
        fillCount++;
        mutations.forEach(function(mutation) {
          return setTimeout(function() {
            el = document.getElementsByName(_this.field.name);
            if (el.length > 0) {
              _this.field.el = el[0];
              _this.options = _this.field.el.children;
              _this.fill(_this.field.newValue);
              return _this.doChange(_this.field.el);
            }
          }, 1000);
        });
        return observer.disconnect();
      }
    });
    return observer.observe(target, config);
  };

  StateSelectField.detect = function(el) {
    var param;
    if (el.mapping && el.mapping.length !== 1) {
      return false;
    }
    param = el.mapping.slice().shift().split('.').pop();
    return param === 'AdministrativeArea';
  };

  return StateSelectField;

})(SelectField);

});

require.register("widget/pop/helpers/text", function(exports, require, module) {
var BaseField, TextField,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseField = require('widget/pop/helpers/base');

module.exports = TextField = (function(_super) {
  __extends(TextField, _super);

  function TextField(field) {
    TextField.__super__.constructor.call(this, field);
  }

  TextField.detect = function(field) {
    var _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
    if (((_ref = field.el) != null ? (_ref1 = _ref.tagName) != null ? _ref1.toLowerCase() : void 0 : void 0) === 'textarea') {
      return true;
    }
    return ((_ref2 = field.el) != null ? (_ref3 = _ref2.tagName) != null ? _ref3.toLowerCase() : void 0 : void 0) === 'input' && ((_ref4 = ((_ref5 = field.el) != null ? _ref5.type : void 0) != null) === 'text' || _ref4 === 'email');
  };

  TextField.prototype.fill = function(value) {
    TextField.__super__.fill.call(this, value);
    if (typeof this.value !== 'string') {
      this.filled = false;
      return;
    }
    this.field.el.value = this.value;
    if (this.field.el.value !== this.initialValue || this.field.el.value === this.value) {
      this.filled = true;
      this.matchType = 'exact';
      return;
    }
    this.filled = false;
    return this.matchType = 'missed';
  };

  return TextField;

})(BaseField);

});

require.register("widget/pop/helpers/two_digits", function(exports, require, module) {
var BaseField, TwoDigitsField,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseField = require('widget/pop/helpers/base');

module.exports = TwoDigitsField = (function(_super) {
  __extends(TwoDigitsField, _super);

  function TwoDigitsField(field) {
    TwoDigitsField.__super__.constructor.call(this, field);
  }

  TwoDigitsField.detect = function(field) {
    var metadata, _ref, _ref1, _ref2, _ref3, _ref4;
    metadata = field.metadata;
    return metadata.tag_name === 'input' && (((_ref = metadata.placeholder) != null ? _ref.length : void 0) === 2 || metadata.max_length === '2' || ((_ref1 = ((_ref2 = metadata.label) != null ? _ref2.toLowerCase() : void 0) || ((_ref3 = metadata.name) != null ? _ref3.toLowerCase() : void 0) || ((_ref4 = metadata.id) != null ? _ref4.toLowerCase() : void 0)) === 'yy' || _ref1 === 'mm'));
  };

  TwoDigitsField.prototype.fill = function(value) {
    var javaSucks;
    TwoDigitsField.__super__.fill.call(this, value);
    value = Number(value);
    if (!isNaN(value)) {
      javaSucks = 100;
      value = value % javaSucks;
      value = value.toString();
      if (isNaN) {
        this.field.el.value = value;
      }
      this.filled = true;
      this.matchType = 'exact';
    }
    return;
    this.filled = false;
    return this.matchType = 'missed';
  };

  return TwoDigitsField;

})(BaseField);

});

require.register("widget/pop/mappings", function(exports, require, module) {
var Domain, Mappings;

Domain = require('widget/domain');

module.exports = Mappings = (function() {
  function Mappings() {}

  Mappings.payload = function(fields) {
    return {
      fields: this.fieldsForMappings(fields),
      location: {
        domain: Domain.full(),
        origin: Domain.origin(),
        path: Domain.fullPath(),
        referrer: Domain.referrer()
      },
      publisher_name: Domain.base(),
      form_name: document.title
    };
  };

  Mappings.fieldsForMappings = function(fields) {
    var field, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = fields.length; _i < _len; _i++) {
      field = fields[_i];
      _results.push(field.metadata);
    }
    return _results;
  };

  Mappings.load = function(args) {
    return this.assignToFields(args);
  };

  Mappings.assignToFields = function(args) {
    var field, _i, _len, _ref, _ref1, _results;
    _ref = args.fields;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      field = _ref[_i];
      _results.push(field.mapping = args.mappings[(_ref1 = field.metadata) != null ? _ref1.pop_id : void 0]);
    }
    return _results;
  };

  return Mappings;

})();

});

require.register("widget/pop/publisher_api", function(exports, require, module) {
var PublisherApi;

module.exports = PublisherApi = (function() {
  function PublisherApi() {}

  PublisherApi.fields = function() {
    var evt, parameterDiv;
    parameterDiv = this.getParameterDiv();
    evt = document.createEvent('Event');
    evt.initEvent('fillr_publisher_get_fields', true, true);
    window.dispatchEvent(evt);
    if ((parameterDiv != null ? parameterDiv.innerText : void 0) === '') {
      return false;
    }
    return JSON.parse(parameterDiv.innerText);
  };

  PublisherApi.populate = function(payload) {
    var evt, parameterDiv, result;
    parameterDiv = this.getParameterDiv();
    parameterDiv.innerText = JSON.stringify(payload);
    evt = document.createEvent('Event');
    evt.initEvent('fillr_publisher_populate', true, true);
    window.dispatchEvent(evt);
    result = parameterDiv.innerText;
    parameterDiv.innerText = '';
    if (result === "true") {
      return true;
    } else {
      return false;
    }
  };

  PublisherApi.getParameterDiv = function() {
    var div;
    div = document.getElementById('fillr_publisher_parameters');
    if (div === null) {
      div = document.createElement("div");
      div.id = 'fillr_publisher_parameters';
      div.style.display = 'none';
      document.body.appendChild(div);
    }
    return div;
  };

  return PublisherApi;

})();

});

require.register("widget/setup", function(exports, require, module) {
window.PopWidgetInterface = require('widget/controller');

});


window.PopWidgetInterface = require('widget/interfaces/ios_sdk'); }).call({}); var style = document.createElement("style"); style.setAttribute("rel", "stylesheet"); style.setAttribute("type", "text/css"); style.appendChild(document.createTextNode(".pop-field { transition: background-color 3s; background-color: default; } .pop-highlight { transition: none !important; background-color: rgba(0, 164, 184, 0.5); }")); document.head.appendChild(style);