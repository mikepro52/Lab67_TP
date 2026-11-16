// Модель лабораторной 6.a и расчёты варианта 12.
// Скидка не вводится руками. Её считает магазин по истории покупок.

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseDay(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!match) return new Date(NaN);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function dayISO(value) {
  var date = parseDay(value);
  if (Number.isNaN(date.getTime())) return null;
  var month = String(date.getMonth() + 1).padStart(2, "0");
  var day = String(date.getDate()).padStart(2, "0");
  return date.getFullYear() + "-" + month + "-" + day;
}

function endOfDay(value) {
  var date = parseDay(value);
  if (Number.isNaN(date.getTime())) return new Date(NaN);
  date.setHours(23, 59, 59, 999);
  return date;
}

function sameDay(left, right) {
  return dayISO(left) !== null && dayISO(left) === dayISO(right);
}

function discountTier(accumulated, hasCard) {
  if (!hasCard) return 0;
  if (accumulated > 500) return 10;
  if (accumulated > 200) return 5;
  return 3;
}

var RESERVED_FILTERS = { sortBy: true, sortDir: true, dateFrom: true, dateTo: true, query: true };
var EXACT_FIELDS = { id: true, author: true, category: true };
var COMPUTED_FIELDS = {
  gross: true,
  discountPercent: true,
  total: true,
  accumulatedBefore: true,
  hadCard: true,
  cardNumber: true,
  cardIssued: true
};
var LOCKED_FIELDS = { id: true, author: true, createdAt: true };

class ObjCollection {
  constructor(objs, onChange) {
    this._objs = [];
    this._onChange = onChange || null;
    this._silent = false;
    if (Array.isArray(objs) && objs.length) this.addAll(objs);
  }

  getObjs(skip, top, filterConfig) {
    var paging = this._paging(skip, top);
    if (!paging) return [];
    if (filterConfig !== undefined && !this._isFilter(filterConfig)) return [];
    return this._prepare(filterConfig).slice(paging.skip, paging.skip + paging.top).map(this._copy, this);
  }

  count(filterConfig) {
    if (filterConfig !== undefined && !this._isFilter(filterConfig)) return 0;
    return this._prepare(filterConfig).length;
  }

  all(filterConfig) {
    return this.getObjs(0, this._objs.length, filterConfig);
  }

  getObj(id) {
    var index = this._indexOf(id);
    return index === -1 ? null : this._copy(this._objs[index]);
  }

  validateObj(obj) {
    return this.explainObj(obj).length === 0;
  }

  explainObj(obj) {
    var prepared = this._prepareObj(obj);
    if (!prepared) return ["Нужен объект продажи"];
    return this._errors(prepared);
  }

  addObj(obj) {
    var copy = this._prepareObj(obj);
    if (!copy) return false;
    if (this._errors(copy).length) return false;
    if (this._indexOf(copy.id) !== -1) return false;
    this._objs.push(copy);
    this._emit();
    return true;
  }

  editObj(id, patch) {
    var index = this._indexOf(id);
    if (index === -1 || !patch || typeof patch !== "object" || Array.isArray(patch)) return false;
    var current = this._objs[index];
    var keys = Object.keys(patch);
    var applicable = keys.filter(function (key) { return !COMPUTED_FIELDS[key]; });
    if (!applicable.length) return false;

    for (var i = 0; i < applicable.length; i += 1) {
      var key = applicable[i];
      if (!LOCKED_FIELDS[key]) continue;
      if (!this._sameLocked(key, current, patch)) return false;
    }

    var next = this._copy(current);
    applicable.forEach(function (key) {
      if (!LOCKED_FIELDS[key]) next[key] = patch[key];
    });
    next = this._prepareObj(next);
    if (this._errors(next).length) return false;
    this._objs[index] = next;
    this._emit();
    return true;
  }

  removeObj(id) {
    var index = this._indexOf(id);
    if (index === -1) return false;
    this._objs.splice(index, 1);
    this._emit();
    return true;
  }

  // Возвращает объекты, которые добавить не удалось.
  addAll(objs) {
    if (!Array.isArray(objs)) return [];
    var failed = [];
    var previous = this._silent;
    this._silent = true;
    for (var i = 0; i < objs.length; i += 1) {
      if (!this.addObj(objs[i])) failed.push(objs[i]);
    }
    this._silent = previous;
    this._emit();
    return failed;
  }

  clear() {
    this._objs = [];
    this._emit();
  }

  // Лабораторная 7: журнал ObjInf в localStorage. Даты пишутся строкой ISO.
  save() {
    if (!hasStorage()) return false;
    try {
      localStorage.setItem("ObjInf", JSON.stringify(this._export()));
      return true;
    } catch (error) {
      return false;
    }
  }

  restore() {
    if (!hasStorage()) return false;
    var raw = localStorage.getItem("ObjInf");
    if (!raw) return false;
    try {
      var list = JSON.parse(raw);
      if (!Array.isArray(list)) return false;
      this.replaceAll(list);
      return true;
    } catch (error) {
      return false;
    }
  }

  replaceAll(list) {
    var source = Array.isArray(list) ? list : [];
    this._silent = true;
    this._objs = [];
    var failed = [];
    for (var i = 0; i < source.length; i += 1) {
      if (!this.addObj(reviveSale(source[i]))) failed.push(source[i]);
    }
    this._silent = false;
    this._emit();
    return failed;
  }

  _export() {
    return this._objs.map(function (obj) {
      var copy = Object.assign({}, obj);
      if (copy.createdAt instanceof Date) copy.createdAt = copy.createdAt.toISOString();
      Object.keys(COMPUTED_FIELDS).forEach(function (key) { delete copy[key]; });
      return copy;
    });
  }

  updateMany(predicate, patch) {
    this._objs.forEach(function (obj) {
      if (predicate(obj)) Object.assign(obj, patch);
    });
  }

  _raw() {
    return this._objs;
  }

  _emit() {
    if (!this._silent && typeof this._onChange === "function") this._onChange();
  }

  _paging(skip, top) {
    if (skip == null || skip === "") skip = 0;
    if (top == null || top === "") top = 10;
    if (typeof skip === "string" && /^\d+$/.test(skip)) skip = Number(skip);
    if (typeof top === "string" && /^\d+$/.test(top)) top = Number(top);
    if (!Number.isInteger(skip) || skip < 0) return null;
    if (!Number.isInteger(top) || top < 0) return null;
    return { skip: skip, top: top };
  }

  _isFilter(filterConfig) {
    return Boolean(filterConfig) && typeof filterConfig === "object" && !Array.isArray(filterConfig);
  }

  _prepare(filterConfig) {
    var self = this;
    return this._objs.filter(function (obj) {
      return self._matches(obj, filterConfig);
    }).sort(function (left, right) {
      return self._compare(left, right, filterConfig);
    });
  }

  _matches(obj, filter) {
    if (!filter) return true;
    if (filter.dateFrom && obj.createdAt < parseDay(filter.dateFrom)) return false;
    if (filter.dateTo && obj.createdAt > endOfDay(filter.dateTo)) return false;
    if (filter.query) {
      var haystack = [obj.description, obj.productName, obj.customerName, obj.article, obj.author]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(String(filter.query).trim().toLowerCase())) return false;
    }
    var keys = Object.keys(filter);
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (RESERVED_FILTERS[key]) continue;
      if (!(key in obj)) return false;
      if (!this._matchValue(obj[key], filter[key], key)) return false;
    }
    return true;
  }

  _matchValue(value, expected, key) {
    if (expected == null || expected === "") return true;
    if (value instanceof Date) return sameDay(value, expected);
    if (typeof value === "number") return Number(value) === Number(expected);
    var left = String(value).trim().toLowerCase();
    var right = String(expected).trim().toLowerCase();
    if (EXACT_FIELDS[key]) return left === right;
    return left.includes(right);
  }

  _compare(left, right, filter) {
    var field = filter && filter.sortBy ? filter.sortBy : "createdAt";
    if (!(field in left) && !(field in right)) field = "createdAt";
    var direction = filter && filter.sortDir === "asc" ? 1 : -1;
    if (filter && filter.sortDir !== "asc" && filter.sortDir !== "desc") {
      direction = field === "productName" || field === "customerName" || field === "author" || field === "category" ? 1 : -1;
    }
    var result = this._compareValues(left[field], right[field]);
    if (result === 0) {
      return String(left.id).localeCompare(String(right.id), "ru", { numeric: true });
    }
    return result * direction;
  }

  _compareValues(left, right) {
    if (left instanceof Date || right instanceof Date) return new Date(left) - new Date(right);
    if (typeof left === "number" || typeof right === "number") return (left || 0) - (right || 0);
    return String(left || "").localeCompare(String(right || ""), "ru", { sensitivity: "base", numeric: true });
  }

  _errors(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return ["Нужен объект продажи"];
    var errors = [];
    if (typeof obj.id !== "string" || obj.id.trim() === "") errors.push("id — непустая строка");
    if (typeof obj.description !== "string") errors.push("description — строка");
    else if (obj.description.trim().length === 0 || obj.description.trim().length >= 200) {
      errors.push("description обязателен и короче 200 символов");
    }
    if (!(obj.createdAt instanceof Date) || Number.isNaN(obj.createdAt.getTime())) {
      errors.push("createdAt — корректная дата, объект Date");
    }
    if (typeof obj.author !== "string" || obj.author.trim() === "") errors.push("author — непустая строка");
    if (obj.photoLink != null && obj.photoLink !== "" && typeof obj.photoLink !== "string") {
      errors.push("photoLink — строка, если поле задано");
    }
    if (typeof obj.photoLink === "string" && obj.photoLink.trim() === "") {
      errors.push("photoLink нельзя оставлять пустой строкой");
    }
    if (typeof obj.productName !== "string" || obj.productName.trim() === "") errors.push("productName — непустая строка");
    if (typeof obj.article !== "string" || obj.article.trim() === "") errors.push("article — непустая строка");
    if (typeof obj.category !== "string" || obj.category.trim() === "") errors.push("category — непустая строка");
    if (!Number.isInteger(obj.quantity) || obj.quantity < 1 || obj.quantity > 1000) {
      errors.push("quantity — целое число от 1 до 1000");
    }
    if (typeof obj.unitPrice !== "number" || !Number.isFinite(obj.unitPrice) || obj.unitPrice <= 0 || obj.unitPrice > 1000000) {
      errors.push("unitPrice — положительное число");
    }
    if (typeof obj.customerName !== "string" || obj.customerName.trim() === "") errors.push("customerName — непустая строка");
    if (typeof obj.customerPhone !== "string" || obj.customerPhone.trim() === "") errors.push("customerPhone — непустая строка");
    if (obj.customerId != null && (typeof obj.customerId !== "string" || obj.customerId.trim() === "")) {
      errors.push("customerId — непустая строка, если поле задано");
    }
    return errors;
  }

  _sameLocked(key, current, patch) {
    if (key === "createdAt") return new Date(patch.createdAt).getTime() === current.createdAt.getTime();
    return String(patch[key]).trim() === String(current[key]).trim();
  }

  _prepareObj(obj) {
    var copy = this._copy(obj);
    if (!copy) return null;
    Object.keys(copy).forEach(function (key) {
      if (typeof copy[key] === "string") copy[key] = copy[key].trim();
    });
    if (copy.photoLink == null || copy.photoLink === "") delete copy.photoLink;
    return copy;
  }

  _copy(obj) {
    if (!obj || typeof obj !== "object") return null;
    var copy = Object.assign({}, obj);
    if (copy.createdAt instanceof Date) copy.createdAt = new Date(copy.createdAt.getTime());
    return copy;
  }

  _indexOf(id) {
    var key = this._id(id);
    if (key == null) return -1;
    for (var i = 0; i < this._objs.length; i += 1) {
      if (this._objs[i].id === key) return i;
    }
    return -1;
  }

  _id(id) {
    if (typeof id === "number" && Number.isFinite(id)) return String(id);
    if (typeof id === "string" && id.trim()) return id.trim();
    return null;
  }
}

class Shop {
  constructor(data) {
    this._customers = (data.customers || []).map(function (item) { return Object.assign({}, item); });
    this._products = (data.products || []).map(function (item) { return Object.assign({}, item); });
    this._employees = (data.employees || []).map(function (item) {
      return Object.assign({}, item, {
        shifts: (item.shifts || []).map(function (shift) { return Object.assign({}, shift); })
      });
    });
    this._receipts = (data.receipts || []).map(function (item) {
      var copy = Object.assign({}, item);
      if (copy.createdAt instanceof Date) copy.createdAt = new Date(copy.createdAt.getTime());
      return copy;
    });
    this._persist = false;
    this._sessionUser = null;
    var self = this;
    this.sales = new ObjCollection();
    this.sales._onChange = function () {
      self._rebuild();
      self._autosave();
    };
    if (data.sales && data.sales.length) this.sales.addAll(data.sales);
  }

  enablePersistence() {
    this._persist = true;
  }

  sessionUser() {
    return this._sessionUser || null;
  }

  setSession(name) {
    this._sessionUser = name || null;
    this._autosave();
  }

  importSeed(data) {
    this._customers = (data.customers || []).map(function (item) { return Object.assign({}, item); });
    this._products = (data.products || []).map(function (item) { return Object.assign({}, item); });
    this._receipts = (data.receipts || []).map(reviveReceipt);
    this._sessionUser = null;
    this.sales.replaceAll(data.sales || []);
  }

  save() {
    if (!hasStorage()) return false;
    try {
      localStorage.setItem("ObjInfState", JSON.stringify({
        customers: this._customers.map(plainCustomer),
        products: this._products.map(function (item) { return Object.assign({}, item); }),
        receipts: this._receipts.map(function (item) {
          var copy = Object.assign({}, item);
          if (copy.createdAt instanceof Date) copy.createdAt = copy.createdAt.toISOString();
          return copy;
        }),
        user: this._sessionUser || null
      }));
      return this.sales.save();
    } catch (error) {
      return false;
    }
  }

  restore() {
    if (!hasStorage()) return false;
    var stateRaw = localStorage.getItem("ObjInfState");
    var salesRaw = localStorage.getItem("ObjInf");
    if (!stateRaw || !salesRaw) return false;
    try {
      var state = JSON.parse(stateRaw);
      var sales = JSON.parse(salesRaw);
      if (!state || !Array.isArray(state.customers) || !Array.isArray(state.products) || !Array.isArray(state.receipts) || !Array.isArray(sales)) {
        return false;
      }
      this._customers = state.customers.map(function (item) { return Object.assign({}, item); });
      this._products = state.products.map(function (item) { return Object.assign({}, item); });
      this._receipts = state.receipts.map(reviveReceipt);
      this._sessionUser = state.user || null;
      this.sales.replaceAll(sales);
      return true;
    } catch (error) {
      return false;
    }
  }

  _autosave() {
    if (this._persist) this.save();
  }

  nextSaleId() {
    return this._nextId(this.sales._raw(), "");
  }

  directoryCustomers() {
    var self = this;
    return this._customers.map(function (customer) {
      var purchases = self.sales._raw().filter(function (sale) { return sale.customerId === customer.id; });
      return Object.assign({}, customer, { purchases: purchases.length });
    }).sort(function (left, right) {
      return right.discountPercent - left.discountPercent || right.accumulated - left.accumulated ||
        left.fullName.localeCompare(right.fullName, "ru");
    });
  }

  directoryProducts() {
    var self = this;
    return this._products.map(function (product) {
      var received = self._sum(self._receipts, product.article);
      var sold = self._sum(self.sales._raw(), product.article);
      return Object.assign({}, product, {
        received: received,
        sold: sold,
        stock: received - sold
      });
    });
  }

  directoryReceipts() {
    return this._receipts.map(function (item) {
      var copy = Object.assign({}, item);
      copy.createdAt = new Date(item.createdAt.getTime());
      return copy;
    }).sort(function (left, right) { return right.createdAt - left.createdAt; });
  }

  directoryStaff() {
    return this._employees.map(function (employee) {
      var hours = employee.shifts.reduce(function (sum, shift) { return sum + shift.hours; }, 0);
      return Object.assign({}, employee, {
        shifts: employee.shifts.map(function (shift) { return Object.assign({}, shift); }),
        hoursTotal: hours
      });
    });
  }

  reportStaff(date) {
    var iso = dayISO(date);
    if (!iso) return { ok: false, message: "Нужна корректная дата", count: 0, totalHours: 0, sellers: [], others: [] };
    var list = [];
    this._employees.forEach(function (employee) {
      var shift = employee.shifts.find(function (item) { return item.date === iso; });
      if (!shift) return;
      list.push({
        fullName: employee.fullName,
        position: employee.position,
        phone: employee.phone,
        hours: shift.hours
      });
    });
    list.sort(function (left, right) { return left.fullName.localeCompare(right.fullName, "ru"); });
    var sellers = list.filter(function (item) { return item.position === "Продавец"; });
    var others = list.filter(function (item) { return item.position !== "Продавец"; });
    var totalHours = list.reduce(function (sum, item) { return sum + item.hours; }, 0);
    return { ok: true, date: iso, count: list.length, totalHours: totalHours, sellers: sellers, others: others, list: list };
  }

  reportVip(date) {
    var end = endOfDay(date);
    if (Number.isNaN(end.getTime())) {
      return { ok: false, message: "Нужна корректная дата", count: 0, list: [] };
    }
    var replay = this._replay(end.getTime());
    var list = [];
    replay.customers.forEach(function (customer) {
      if (customer.discountPercent === 10) {
        list.push({
          fullName: customer.fullName,
          phone: customer.phone,
          accumulated: customer.accumulated,
          cardNumber: customer.cardNumber
        });
      }
    });
    list.sort(function (left, right) { return left.fullName.localeCompare(right.fullName, "ru"); });
    return { ok: true, date: dayISO(date), count: list.length, list: list };
  }

  reportBirthdays(date) {
    var iso = dayISO(date);
    if (!iso) return { ok: false, message: "Нужна корректная дата", count: 0, list: [] };
    var monthDay = iso.slice(5);
    var list = this._customers.filter(function (customer) {
      return customer.birthday.slice(5) === monthDay;
    }).map(function (customer) {
      return {
        fullName: customer.fullName,
        phone: customer.phone,
        birthday: customer.birthday,
        age: ageOn(customer.birthday, iso)
      };
    }).sort(function (left, right) { return left.fullName.localeCompare(right.fullName, "ru"); });
    return { ok: true, date: iso, count: list.length, list: list };
  }

  reportDynamics(article, from, to) {
    var start = parseDay(from);
    var finish = endOfDay(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(finish.getTime())) {
      return { ok: false, message: "Укажите начало и конец периода", months: [] };
    }
    if (start > finish) return { ok: false, message: "Начало периода позже конца", months: [] };
    var code = String(article || "").trim();
    if (!code) return { ok: false, message: "Выберите артикул", months: [] };
    var product = this._products.find(function (item) { return item.article.toLowerCase() === code.toLowerCase(); });
    var months = [];
    var cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    var last = new Date(finish.getFullYear(), finish.getMonth(), 1);
    while (cursor <= last && months.length < 36) {
      months.push({
        key: cursor.getFullYear() + "-" + String(cursor.getMonth() + 1).padStart(2, "0"),
        label: new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(cursor),
        received: 0,
        sold: 0
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    var byKey = {};
    months.forEach(function (month) { byKey[month.key] = month; });
    this._collect(this._receipts, code, start, finish, byKey, "received");
    this._collect(this.sales._raw(), code, start, finish, byKey, "sold");
    var received = months.reduce(function (sum, month) { return sum + month.received; }, 0);
    var sold = months.reduce(function (sum, month) { return sum + month.sold; }, 0);
    return {
      ok: true,
      article: product ? product.article : code,
      productName: product ? product.name : code,
      from: dayISO(start),
      to: dayISO(to),
      months: months,
      received: received,
      sold: sold
    };
  }

  addCustomer(obj) {
    var errors = this._customerErrors(obj);
    if (errors.length) return { ok: false, errors: errors };
    var customer = {
      id: this._nextId(this._customers, "c"),
      fullName: obj.fullName.trim(),
      phone: obj.phone.trim(),
      birthday: obj.birthday,
      accumulated: 0,
      discountPercent: 0,
      cardNumber: null
    };
    this._customers.push(customer);
    this._autosave();
    return { ok: true, id: customer.id };
  }

  editCustomer(id, patch) {
    var customer = this._customers.find(function (item) { return item.id === id; });
    if (!customer || !patch) return { ok: false, errors: ["Покупатель не найден"] };
    var next = {
      fullName: patch.fullName != null ? patch.fullName : customer.fullName,
      phone: patch.phone != null ? patch.phone : customer.phone,
      birthday: patch.birthday != null ? patch.birthday : customer.birthday
    };
    var errors = this._customerErrors(next);
    if (errors.length) return { ok: false, errors: errors };
    customer.fullName = next.fullName.trim();
    customer.phone = next.phone.trim();
    customer.birthday = next.birthday;
    this.sales.updateMany(function (sale) { return sale.customerId === id; }, {
      customerName: customer.fullName,
      customerPhone: customer.phone
    });
    this._autosave();
    return { ok: true };
  }

  removeCustomer(id) {
    var used = this.sales._raw().some(function (sale) { return sale.customerId === id; });
    if (used) return false;
    var index = this._customers.findIndex(function (item) { return item.id === id; });
    if (index === -1) return false;
    this._customers.splice(index, 1);
    this._autosave();
    return true;
  }

  addProduct(obj) {
    var errors = this._productErrors(obj, null);
    if (errors.length) return { ok: false, errors: errors };
    var product = {
      id: this._nextId(this._products, "g"),
      article: obj.article.trim(),
      name: obj.name.trim(),
      category: obj.category.trim(),
      price: Number(obj.price),
      photoLink: photoFor(obj.category),
      description: String(obj.description || "").trim()
    };
    this._products.push(product);
    this._autosave();
    return { ok: true, id: product.id };
  }

  editProduct(id, patch) {
    var product = this._products.find(function (item) { return item.id === id; });
    if (!product || !patch) return { ok: false, errors: ["Товар не найден"] };
    var next = {
      name: patch.name != null ? patch.name : product.name,
      article: product.article,
      category: patch.category != null ? patch.category : product.category,
      price: patch.price != null ? Number(patch.price) : product.price,
      description: patch.description != null ? patch.description : product.description
    };
    var errors = this._productErrors(next, product.id);
    if (errors.length) return { ok: false, errors: errors };
    product.name = next.name.trim();
    product.category = next.category.trim();
    product.price = next.price;
    product.description = String(next.description || "").trim();
    product.photoLink = photoFor(product.category);
    this._autosave();
    return { ok: true };
  }

  removeProduct(id) {
    var product = this._products.find(function (item) { return item.id === id; });
    if (!product) return false;
    var moved = this._sum(this._receipts, product.article) + this._sum(this.sales._raw(), product.article);
    if (moved > 0) return false;
    this._products = this._products.filter(function (item) { return item.id !== id; });
    this._autosave();
    return true;
  }

  addReceipt(obj) {
    var errors = [];
    if (!obj || typeof obj.invoiceNumber !== "string" || !obj.invoiceNumber.trim()) errors.push("Укажите номер накладной");
    var date = obj && obj.createdAt instanceof Date ? obj.createdAt : parseDay(obj && obj.invoiceDate);
    if (!obj || Number.isNaN(date.getTime())) errors.push("Укажите дату накладной");
    var product = this._products.find(function (item) {
      return obj && item.article.toLowerCase() === String(obj.article || "").trim().toLowerCase();
    });
    if (!product) errors.push("Такого артикула в каталоге нет");
    if (!obj || !Number.isInteger(obj.quantity) || obj.quantity < 1) errors.push("Количество — целое число больше нуля");
    if (errors.length) return { ok: false, errors: errors };
    var receipt = {
      id: this._nextId(this._receipts, "r"),
      invoiceNumber: obj.invoiceNumber.trim(),
      description: "Поступление по накладной " + obj.invoiceNumber.trim() + ": " + product.name + ", " + obj.quantity + " шт.",
      createdAt: new Date(date.getTime()),
      author: String(obj.author || "Морозов Павел").trim(),
      article: product.article,
      productName: product.name,
      category: product.category,
      quantity: obj.quantity
    };
    this._receipts.push(receipt);
    this._autosave();
    return { ok: true, id: receipt.id };
  }

  _rebuild() {
    var replay = this._replay(null);
    var self = this;
    this._customers.forEach(function (customer) {
      var next = replay.customers.get(customer.id);
      customer.accumulated = next.accumulated;
      customer.cardNumber = next.cardNumber;
      customer.discountPercent = next.discountPercent;
    });
    this.sales._raw().forEach(function (sale) {
      var computed = replay.sales.get(sale.id);
      if (!computed) return;
      Object.assign(sale, computed);
    });
  }

  preview(draft) {
    if (!draft || !(draft.createdAt instanceof Date) || Number.isNaN(draft.createdAt.getTime())) return null;
    var quantity = Number(draft.quantity);
    var unitPrice = Number(draft.unitPrice);
    if (!Number.isInteger(quantity) || quantity < 1 || !(unitPrice > 0)) return null;
    var customerId = draft.customerId || "";
    if (!customerId && draft.customerName) {
      var found = this._customers.find(function (item) {
        return item.fullName.toLowerCase() === String(draft.customerName).trim().toLowerCase();
      });
      if (found) customerId = found.id;
    }
    if (!customerId || customerId === "__new__") {
      var freshGross = round2(quantity * unitPrice);
      return {
        discountPercent: 0,
        total: freshGross,
        cardNumber: null,
        cardIssued: freshGross > 50
      };
    }
    var replay = this._replay(null, {
      skipId: draft.id,
      extra: [{
        id: "__preview__",
        createdAt: draft.createdAt,
        quantity: quantity,
        unitPrice: unitPrice,
        customerId: customerId
      }]
    });
    var priced = replay.sales.get("__preview__");
    if (!priced) return null;
    return {
      discountPercent: priced.discountPercent,
      total: priced.total,
      cardNumber: priced.cardNumber,
      cardIssued: priced.cardIssued
    };
  }

  _replay(untilMs, options) {
    var skipId = options && options.skipId;
    var extra = options && options.extra ? options.extra : [];
    var customers = new Map();
    var usedCards = new Set();
    this._customers.forEach(function (customer) {
      customers.set(customer.id, {
        id: customer.id,
        fullName: customer.fullName,
        phone: customer.phone,
        birthday: customer.birthday,
        accumulated: 0,
        cardNumber: null,
        discountPercent: 0
      });
    });
    var sales = new Map();
    var ordered = this.sales._raw().filter(function (sale) {
      return !skipId || sale.id !== skipId;
    }).concat(extra).sort(function (left, right) {
      return left.createdAt - right.createdAt || String(left.id).localeCompare(String(right.id), "ru", { numeric: true });
    });
    ordered.forEach(function (sale) {
      if (untilMs != null && sale.createdAt.getTime() > untilMs) return;
      var gross = round2(sale.quantity * sale.unitPrice);
      var customer = customers.get(sale.customerId);
      var hadCard = Boolean(customer && customer.cardNumber);
      var before = customer ? customer.accumulated : 0;
      var percent = customer ? discountTier(before, hadCard) : 0;
      if (customer) {
        customer.accumulated = round2(before + gross);
        if (!customer.cardNumber && gross > 50) {
          customer.cardNumber = issueCard(customer.id, usedCards);
        }
        if (customer.cardNumber) usedCards.add(customer.cardNumber);
        customer.discountPercent = discountTier(customer.accumulated, Boolean(customer.cardNumber));
      }
      sales.set(sale.id, {
        gross: gross,
        discountPercent: percent,
        total: round2(gross * (1 - percent / 100)),
        accumulatedBefore: before,
        hadCard: hadCard,
        cardNumber: customer ? customer.cardNumber : null,
        cardIssued: Boolean(customer && customer.cardNumber && !hadCard)
      });
    });
    return { customers: customers, sales: sales };
  }

  _collect(list, article, start, finish, byKey, field) {
    list.forEach(function (item) {
      if (item.article.toLowerCase() !== article.toLowerCase()) return;
      if (item.createdAt < start || item.createdAt > finish) return;
      var key = item.createdAt.getFullYear() + "-" + String(item.createdAt.getMonth() + 1).padStart(2, "0");
      if (byKey[key]) byKey[key][field] += item.quantity;
    });
  }

  _sum(list, article) {
    return list.reduce(function (sum, item) {
      return item.article === article ? sum + item.quantity : sum;
    }, 0);
  }

  _nextId(list, prefix) {
    var max = 0;
    list.forEach(function (item) {
      var match = String(item.id).match(/(\d+)$/);
      if (match) max = Math.max(max, Number(match[1]));
    });
    return prefix + String(max + 1);
  }

  _customerErrors(obj) {
    var errors = [];
    if (!obj || typeof obj.fullName !== "string" || obj.fullName.trim().length < 5 || !obj.fullName.trim().includes(" ")) {
      errors.push("Укажите фамилию и имя");
    }
    var digits = obj && typeof obj.phone === "string" ? obj.phone.replace(/\D/g, "") : "";
    if (digits.length < 9) errors.push("Укажите телефон");
    if (!obj || !/^\d{4}-\d{2}-\d{2}$/.test(obj.birthday) || Number.isNaN(parseDay(obj.birthday).getTime())) {
      errors.push("День рождения в формате ГГГГ-ММ-ДД");
    }
    return errors;
  }

  _productErrors(obj, ignoreId) {
    var errors = [];
    if (!obj || typeof obj.name !== "string" || obj.name.trim().length < 2) errors.push("Укажите название");
    if (!obj || typeof obj.article !== "string" || obj.article.trim().length < 2) errors.push("Укажите артикул");
    if (!obj || typeof obj.category !== "string" || !obj.category.trim()) errors.push("Укажите вид товара");
    var price = obj ? Number(obj.price) : NaN;
    if (!Number.isFinite(price) || price <= 0) errors.push("Укажите цену");
    var article = obj && obj.article ? obj.article.trim().toLowerCase() : "";
    var duplicate = this._products.some(function (item) {
      return item.id !== ignoreId && item.article.toLowerCase() === article;
    });
    if (duplicate) errors.push("Такой артикул уже есть");
    return errors;
  }
}

function issueCard(id, used) {
  var preset = typeof CARD_NUMBERS !== "undefined" ? CARD_NUMBERS[id] : null;
  if (preset && !used.has(preset)) return preset;
  var seed = 10000;
  for (var i = 0; i < String(id).length; i += 1) seed = (seed + id.charCodeAt(i) * (i + 3)) % 90000;
  var number = String(10000 + seed).padStart(5, "0");
  while (used.has(number)) {
    seed = (seed + 17) % 90000;
    number = String(10000 + seed).padStart(5, "0");
  }
  return number;
}

function photoFor(category) {
  var map = {
    "Одежда": "img/clothing.svg",
    "Обувь": "img/shoes.svg",
    "Кожгалантерея": "img/leather.svg",
    "Чулочно-носочные изделия": "img/hosiery.svg"
  };
  return map[category] || "img/clothing.svg";
}

function ageOn(birthday, onDate) {
  var born = parseDay(birthday);
  var on = parseDay(onDate);
  var age = on.getFullYear() - born.getFullYear();
  var before = on.getMonth() < born.getMonth() || (on.getMonth() === born.getMonth() && on.getDate() < born.getDate());
  return before ? age - 1 : age;
}

function hasStorage() {
  return typeof localStorage !== "undefined" && localStorage !== null;
}

function reviveSale(item) {
  var copy = Object.assign({}, item);
  if (!(copy.createdAt instanceof Date)) copy.createdAt = new Date(copy.createdAt);
  Object.keys(COMPUTED_FIELDS).forEach(function (key) { delete copy[key]; });
  return copy;
}

function reviveReceipt(item) {
  var copy = Object.assign({}, item);
  if (!(copy.createdAt instanceof Date)) copy.createdAt = new Date(copy.createdAt);
  return copy;
}

function plainCustomer(item) {
  return {
    id: item.id,
    fullName: item.fullName,
    phone: item.phone,
    birthday: item.birthday
  };
}
