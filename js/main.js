// Лабораторная 6: в консоли user — текущий сотрудник или null.
var user = null;

// Контроллер лабораторной 7. Обработчики и состояние страницы наружу не торчат.
(function () {
  "use strict";

  var shop = new Shop({
    customers: [],
    products: [],
    employees: employees,
    receipts: [],
    sales: []
  });
  if (!shop.restore()) {
    shop.importSeed({
      customers: customers,
      products: products,
      receipts: receipts,
      sales: ObjInf
    });
    shop.save();
  }
  user = shop.sessionUser();
  shop.enablePersistence();

var modal = new ModalView();
var ui = {
  section: "sales",
  skip: 0,
  top: 10,
  openId: null,
  filter: { sortBy: "createdAt", sortDir: "desc" },
  reportInputs: {
    staffDate: DEMO_DATE,
    discountDate: DEMO_DATE,
    birthdayDate: DEMO_DATE,
    article: "PL-104",
    from: "2026-08-01",
    to: DEMO_DATE
  }
};

function addObj(obj) {
  var sale = prepareSale(obj);
  if (!sale) return false;
  var errors = shop.sales.explainObj(sale);
  if (errors.length) {
    toast(errors[0], "bad");
    console.warn(errors);
    return false;
  }
  if (!shop.sales.addObj(sale)) {
    toast("Чек с id " + sale.id + " уже есть.", "bad");
    return false;
  }
  toast("Чек № " + sale.id + " записан.");
  ui.section = "sales";
  ui.skip = 0;
  ui.openId = sale.id;
  paint();
  return true;
}

function editObj(id, patch) {
  var current = shop.sales.getObj(id);
  if (!current || !patch || typeof patch !== "object") {
    toast("Чек не найден.", "bad");
    return false;
  }
  if (hasLockedChange(current, patch)) {
    toast("Нельзя менять id, author и createdAt.", "bad");
    return false;
  }
  var next = normalizePatch(patch);
  if (!shop.sales.editObj(id, next)) {
    var errors = shop.sales.explainObj(Object.assign({}, current, next));
    toast(errors[0] || "Чек не изменён.", "bad");
    return false;
  }
  toast("Чек № " + id + " изменён.");
  ui.openId = String(id);
  paint();
  return true;
}

function removeObj(id) {
  if (!shop.sales.removeObj(id)) {
    toast("Чек не найден.", "bad");
    return false;
  }
  if (ui.openId === String(id)) ui.openId = null;
  toast("Чек № " + id + " удалён.");
  paint();
  return true;
}

function getObjs(skip, top, filterConfig) {
  return shop.sales.getObjs(skip, top, filterConfig);
}

function getObj(id) {
  return shop.sales.getObj(id);
}

function validateObj(obj) {
  return shop.sales.validateObj(obj);
}

function explainObj(obj) {
  return shop.sales.explainObj(obj);
}

function addAll(objs) {
  var rejected = shop.sales.addAll(objs);
  paint();
  return rejected;
}

function clearCollection() {
  shop.sales.clear();
  ui.skip = 0;
  ui.openId = null;
  toast("Журнал продаж очищен.");
  paint();
  return true;
}

function setUser(name) {
  user = name && String(name).trim() ? String(name).trim() : null;
  if (!user) {
    ui.filter = { sortBy: "createdAt", sortDir: "desc" };
    ui.skip = 0;
  }
  shop.setSession(user);
  paint();
  return user;
}

function resetStore() {
  shop.importSeed({
    customers: customers,
    products: products,
    receipts: receipts,
    sales: ObjInf
  });
  user = null;
  shop.setSession(null);
  ui.section = "sales";
  ui.skip = 0;
  ui.openId = null;
  ui.filter = { sortBy: "createdAt", sortDir: "desc" };
  paint();
  toast("Журнал возвращён к исходным данным.");
  return true;
}

function applyFilter(config) {
  ui.filter = Object.assign({ sortBy: "createdAt", sortDir: "desc" }, config || {});
  ui.skip = 0;
  ui.section = "sales";
  paint();
  return shop.sales.getObjs(0, ui.top, ui.filter);
}

function staffOnDate(date) {
  ui.section = "reports";
  ui.reportInputs.staffDate = date;
  paint();
  return shop.reportStaff(date);
}

function customersWithDiscount(date) {
  ui.section = "reports";
  ui.reportInputs.discountDate = date;
  paint();
  return shop.reportVip(date);
}

function birthdaysOn(date) {
  ui.section = "reports";
  ui.reportInputs.birthdayDate = date;
  paint();
  return shop.reportBirthdays(date);
}

function productDynamics(article, from, to) {
  ui.section = "reports";
  ui.reportInputs.article = article;
  ui.reportInputs.from = from;
  ui.reportInputs.to = to;
  paint();
  return shop.reportDynamics(article, from, to);
}

function runSelfCheck() {
  var checks = [];
  function mark(name, cond) {
    var ok = false;
    var detail = "";
    try {
      ok = Boolean(typeof cond === "function" ? cond() : cond);
    } catch (error) {
      detail = error.message;
    }
    checks.push({ name: name, ok: ok, detail: detail });
  }

  var box = new Shop({
    customers: customers,
    products: products,
    employees: employees,
    receipts: receipts,
    sales: []
  });
  var coat = {
    id: "t1",
    description: "Проверка: пальто шерстяное",
    createdAt: new Date(2026, 0, 20, 10, 0, 0),
    author: "Соколова Мария",
    photoLink: "img/clothing.svg",
    productName: "Пальто шерстяное",
    article: "PL-104",
    category: "Одежда",
    quantity: 1,
    unitPrice: 189,
    customerId: "c1",
    customerName: "Петрова Анна Сергеевна",
    customerPhone: "+375 29 612-44-18"
  };
  mark("validateObj принимает чек", box.sales.validateObj(coat));
  mark("validateObj отвергает пустое описание", box.sales.validateObj(Object.assign({}, coat, { description: "" })) === false);
  mark("validateObj ждёт объект Date", box.sales.validateObj(Object.assign({}, coat, { createdAt: "2026-01-20" })) === false);
  mark("explainObj объясняет пустой объект", box.sales.explainObj({}).length > 0);
  mark("addObj записывает первый чек без скидки и с картой", function () {
    return box.sales.addObj(coat) && box.sales.getObj("t1").discountPercent === 0 && box.sales.getObj("t1").cardIssued === true;
  });
  mark("addObj не берёт повторный id", box.sales.addObj(coat) === false);
  mark("getObj для неизвестного id", box.sales.getObj("нет") === null);
  mark("вторая покупка уже со скидкой 3%", function () {
    var second = Object.assign({}, coat, {
      id: "t2",
      description: "Вторая проверка пальто",
      createdAt: new Date(2026, 1, 2, 12, 0, 0)
    });
    return box.sales.addObj(second) && box.sales.getObj("t2").discountPercent === 3;
  });
  mark("getObjs сортирует по дате", function () {
    var page = box.sales.getObjs(0, 1);
    return page.length === 1 && page[0].id === "t2";
  });
  mark("getObjs берёт вторую страницу", box.sales.getObjs(1, 1)[0].id === "t1");
  mark("getObjs фильтрует продавца", box.sales.getObjs(0, 10, { author: "Соколова Мария" }).length === 2);
  mark("editObj меняет описание", box.sales.editObj("t1", { description: "Новая информация" }) && box.sales.getObj("t1").description === "Новая информация");
  mark("editObj не меняет author", box.sales.editObj("t1", { author: "Другой" }) === false);
  mark("editObj не меняет id", box.sales.editObj("t1", { id: "zz" }) === false);
  mark("editObj не меняет createdAt", box.sales.editObj("t1", { createdAt: new Date() }) === false);
  mark("removeObj удаляет чек", box.sales.removeObj("t2") && box.sales.getObj("t2") === null);
  mark("removeObj повторно", box.sales.removeObj("t2") === false);
  mark("addAll возвращает отклонённые", function () {
    var rejected = box.sales.addAll([
      { id: "bad" },
      Object.assign({}, coat, { id: "t3", description: "Пакетная продажа", createdAt: new Date(2026, 2, 1, 11, 0, 0) })
    ]);
    return rejected.length === 1 && box.sales.getObj("t3");
  });
  mark("clear очищает журнал", function () {
    box.sales.clear();
    return box.sales.count() === 0;
  });

  mark("в журнале магазина не меньше 20 чеков", shop.sales.count() >= 20);
  mark("страницы getObjs не пересекаются", function () {
    var first = shop.sales.getObjs(0, 10).map(function (sale) { return sale.id; });
    var second = shop.sales.getObjs(10, 10).map(function (sale) { return sale.id; });
    return first.length === 10 && second.length === 10 && first.indexOf(second[0]) === -1;
  });
  mark("поиск по описанию", function () {
    var found = shop.sales.getObjs(0, 50, { description: "пальто" });
    return found.length > 0 && found.every(function (sale) { return sale.description.toLowerCase().indexOf("пальто") !== -1; });
  });
  mark("смены 16 ноября", function () {
    var report = shop.reportStaff("2026-11-16");
    return report.ok && report.sellers.length === 3 && report.others.length === 4 && report.totalHours === 51;
  });
  mark("10% на 1 января ещё нет", shop.reportVip("2026-01-01").count === 0);
  mark("именинники 16 ноября", shop.reportBirthdays("2026-11-16").count === 2);
  mark("динамика пальто", function () {
    var report = shop.reportDynamics("PL-104", "2026-08-01", "2026-11-16");
    return report.ok && (report.received > 0 || report.sold > 0);
  });
  mark("плохая дата отчёта", shop.reportStaff("вчера").ok === false);

  var passed = checks.filter(function (item) { return item.ok; }).length;
  console.info("АИС «Анализ продаж»: проверка методов " + passed + "/" + checks.length);
  var failed = checks.filter(function (item) { return !item.ok; });
  if (failed.length) console.table(failed);
  return checks;
}

var salesLab = {
  addObj: addObj,
  editObj: editObj,
  removeObj: removeObj,
  getObjs: getObjs,
  getObj: getObj,
  validateObj: validateObj,
  explainObj: explainObj,
  addAll: addAll,
  clear: clearCollection,
  setUser: setUser,
  applyFilter: applyFilter,
  staffOnDate: staffOnDate,
  customersWithDiscount: customersWithDiscount,
  birthdaysOn: birthdaysOn,
  productDynamics: productDynamics,
  runSelfCheck: runSelfCheck,
  reset: resetStore,
  save: function () { return shop.save(); },
  restore: function () { return shop.restore(); }
};

function prepareSale(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    toast("Чек должен быть объектом.", "bad");
    return null;
  }
  var sale = Object.assign({}, obj);
  if (sale.id == null || sale.id === "") sale.id = shop.nextSaleId();
  else sale.id = String(sale.id).trim();
  if (!sale.author && user) sale.author = user;
  var product = findProduct(sale.article);
  if (product) {
    if (!sale.productName) sale.productName = product.name;
    if (!sale.category) sale.category = product.category;
    if (sale.unitPrice == null || sale.unitPrice === "") sale.unitPrice = product.price;
    if (!sale.photoLink) sale.photoLink = product.photoLink;
    if (sale.description == null) {
      sale.description = product.name + ", арт. " + product.article + ", " + (sale.quantity || 1) + " шт.";
    }
  }
  if (typeof sale.unitPrice === "string") sale.unitPrice = Number(String(sale.unitPrice).replace(",", "."));
  if (typeof sale.quantity === "string" && /^\d+$/.test(sale.quantity.trim())) sale.quantity = Number(sale.quantity);
  var customer = findCustomer(sale.customerId, sale.customerName);
  if (customer) {
    sale.customerId = customer.id;
    sale.customerName = customer.fullName;
    if (!sale.customerPhone) sale.customerPhone = customer.phone;
  }
  return sale;
}

function normalizePatch(patch) {
  var next = Object.assign({}, patch);
  if (typeof next.quantity === "string" && /^\d+$/.test(next.quantity.trim())) next.quantity = Number(next.quantity);
  if (typeof next.unitPrice === "string") next.unitPrice = Number(String(next.unitPrice).replace(",", "."));
  return next;
}

function hasLockedChange(current, patch) {
  if ("id" in patch && String(patch.id).trim() !== String(current.id)) return true;
  if ("author" in patch && String(patch.author).trim() !== String(current.author)) return true;
  if ("createdAt" in patch && new Date(patch.createdAt).getTime() !== current.createdAt.getTime()) return true;
  return false;
}

function findProduct(article) {
  if (!article) return null;
  return shop.directoryProducts().find(function (product) {
    return product.article.toLowerCase() === String(article).trim().toLowerCase();
  }) || null;
}

function findCustomer(id, name) {
  var list = shop.directoryCustomers();
  if (id) {
    var byId = list.find(function (customer) { return customer.id === id; });
    if (byId) return byId;
  }
  if (!name) return null;
  var query = String(name).trim().toLowerCase();
  return list.find(function (customer) { return customer.fullName.toLowerCase() === query; }) || null;
}

function buildState() {
  var total = shop.sales.count(ui.filter);
  if (total === 0) ui.skip = 0;
  else if (ui.skip >= total) ui.skip = Math.floor((total - 1) / ui.top) * ui.top;
  var page = shop.sales.getObjs(ui.skip, ui.top, ui.filter);
  var sales = shop.sales.all();
  var revenue = round2(sales.reduce(function (sum, sale) { return sum + sale.total; }, 0));
  var people = shop.directoryCustomers();
  var staff = shop.directoryStaff();
  return {
    user: user,
    employee: staff.find(function (person) { return person.fullName === user; }) || null,
    section: ui.section,
    staff: staff,
    customers: people,
    products: shop.directoryProducts(),
    receipts: shop.directoryReceipts(),
    collectionSize: sales.length,
    seedSize: ObjInf.length,
    revenue: revenue,
    average: sales.length ? round2(revenue / sales.length) : 0,
    checks: sales.length,
    cards: people.filter(function (customer) { return customer.cardNumber; }).length,
    vips: people.filter(function (customer) { return customer.discountPercent === 10; }).length,
    filter: ui.filter,
    skip: ui.skip,
    top: ui.top,
    page: page,
    total: total,
    openId: ui.openId,
    authors: uniqueAuthors(sales),
    reportInputs: ui.reportInputs,
    reports: {
      staff: shop.reportStaff(ui.reportInputs.staffDate),
      vip: shop.reportVip(ui.reportInputs.discountDate),
      birthdays: shop.reportBirthdays(ui.reportInputs.birthdayDate),
      dynamics: shop.reportDynamics(ui.reportInputs.article, ui.reportInputs.from, ui.reportInputs.to)
    }
  };
}

function uniqueAuthors(sales) {
  var seen = {};
  var names = [];
  sales.forEach(function (sale) {
    if (seen[sale.author]) return;
    seen[sale.author] = true;
    names.push(sale.author);
  });
  names.sort(function (left, right) { return left.localeCompare(right, "ru"); });
  return names;
}

function paint() {
  var state = buildState();
  var titles = {
    sales: "Журнал продаж",
    customers: "Покупатели",
    products: "Товары",
    receipts: "Накладные",
    staff: "Сотрудники",
    reports: "Отчёты"
  };
  document.title = (titles[ui.section] || "Меркурий") + " — Меркурий";
  document.getElementById("app").replaceChildren(
    renderHeader(state),
    el("div", { class: "layout" }, [
      renderNav(state),
      el("div", { class: "workspace" }, [renderPage(state)])
    ])
  );
}

function readFilters(form) {
  var data = Object.fromEntries(new FormData(form).entries());
  var filter = { sortBy: data.sortBy || "createdAt", sortDir: data.sortDir || "desc" };
  ["query", "author", "category", "article", "dateFrom", "dateTo"].forEach(function (key) {
    if (data[key]) filter[key] = data[key];
  });
  if (data.discount !== "") filter.discountPercent = Number(data.discount);
  return filter;
}

function captureReports() {
  var staff = document.getElementById("report-staff-date");
  var vip = document.getElementById("report-vip-date");
  var birthday = document.getElementById("report-bday-date");
  var article = document.getElementById("report-article");
  var from = document.getElementById("report-from");
  var to = document.getElementById("report-to");
  if (staff) ui.reportInputs.staffDate = staff.value;
  if (vip) ui.reportInputs.discountDate = vip.value;
  if (birthday) ui.reportInputs.birthdayDate = birthday.value;
  if (article) ui.reportInputs.article = article.value;
  if (from) ui.reportInputs.from = from.value;
  if (to) ui.reportInputs.to = to.value;
}

function openSaleModal(sale) {
  var list = shop.directoryProducts();
  var people = shop.directoryCustomers();
  var current = sale || null;
  var article = current ? current.article : list[0].article;
  modal.open({
    kind: current ? "edit-sale" : "add-sale",
    title: current ? "Чек № " + current.id : "Новая продажа",
    text: "Скидку система поставит сама: по сумме покупок до этого чека и по карте.",
    confirm: current ? "Сохранить" : "Записать чек",
    payload: current,
    fields: [
      { name: "article", label: "Товар", type: "select", value: article, options: list.map(function (product) {
        return { value: product.article, label: product.name + " · " + product.article };
      }) },
      { name: "quantity", label: "Количество", type: "number", min: "1", step: "1", value: current ? current.quantity : 1, required: true },
      { name: "unitPrice", label: "Цена, Br", type: "number", min: "0.01", step: "0.01", value: current ? current.unitPrice : (findProduct(article) ? findProduct(article).price : ""), required: true },
      { name: "customerId", label: "Покупатель", type: "select", value: current ? current.customerId : people[0].id, options: people.map(function (customer) {
        return { value: customer.id, label: customer.fullName };
      }) },
      { name: "createdAt", label: "Дата чека", type: "datetime-local", value: toLocalInput(current ? current.createdAt : new Date(2026, 10, 16, 12, 0, 0)), readOnly: Boolean(current), required: true },
      { name: "description", label: "Описание", type: "textarea", wide: true, auto: !current, required: true, value: current ? current.description : draftDescription(article, 1) }
    ]
  });
}

function draftDescription(article, quantity) {
  var product = findProduct(article);
  if (!product) return "";
  return product.name + ", арт. " + product.article + ", " + quantity + " шт.";
}

function submitModal() {
  var values = modal.values();
  var kind = modal.kind;
  var payload = modal.payload;
  if (kind === "login") {
    if (!values.name) {
      toast("Выберите сотрудника.", "bad");
      return;
    }
    setUser(values.name);
    modal.close();
    toast("Вы вошли как " + values.name + ".");
    return;
  }
  if (kind === "add-sale" || kind === "edit-sale") {
    var product = findProduct(values.article);
    var customer = findCustomer(values.customerId);
    if (!product || !customer) {
      toast("Выберите товар и покупателя.", "bad");
      return;
    }
    var quantity = Number(values.quantity);
    var unitPrice = Number(String(values.unitPrice).replace(",", "."));
    var fields = {
      description: values.description.trim(),
      article: product.article,
      productName: product.name,
      category: product.category,
      photoLink: product.photoLink,
      quantity: quantity,
      unitPrice: unitPrice,
      customerId: customer.id,
      customerName: customer.fullName,
      customerPhone: customer.phone
    };
    var ok = kind === "edit-sale"
      ? editObj(payload.id, fields)
      : addObj(Object.assign(fields, { createdAt: parseLocalDateTime(values.createdAt), author: user }));
    if (ok) modal.close();
    return;
  }
  if (kind === "delete-sale") {
    if (removeObj(payload.id)) modal.close();
    return;
  }
  if (kind === "add-customer" || kind === "edit-customer") {
    var customerPatch = { fullName: values.fullName, phone: values.phone, birthday: values.birthday };
    var customerResult = kind === "add-customer"
      ? shop.addCustomer(customerPatch)
      : shop.editCustomer(payload.id, customerPatch);
    if (!customerResult.ok) {
      toast(customerResult.errors[0], "bad");
      return;
    }
    toast(kind === "add-customer" ? "Покупатель добавлен." : "Карточка покупателя обновлена.");
    modal.close();
    paint();
    return;
  }
  if (kind === "delete-customer") {
    if (!shop.removeCustomer(payload.id)) {
      toast("Покупателя с продажами удалить нельзя.", "bad");
      return;
    }
    toast("Покупатель удалён.");
    modal.close();
    paint();
    return;
  }
  if (kind === "add-product" || kind === "edit-product") {
    var productPatch = {
      name: values.name,
      article: values.article,
      category: values.category,
      price: Number(String(values.price).replace(",", ".")),
      description: values.description
    };
    var productResult = kind === "add-product" ? shop.addProduct(productPatch) : shop.editProduct(payload.id, productPatch);
    if (!productResult.ok) {
      toast(productResult.errors[0], "bad");
      return;
    }
    toast(kind === "add-product" ? "Товар добавлен." : "Товар обновлён.");
    modal.close();
    paint();
    return;
  }
  if (kind === "delete-product") {
    if (!shop.removeProduct(payload.id)) {
      toast("Товар с движением по складу не удаляется.", "bad");
      return;
    }
    toast("Товар удалён.");
    modal.close();
    paint();
  }
  if (kind === "add-receipt") {
    var receipt = shop.addReceipt({
      invoiceNumber: values.invoiceNumber,
      invoiceDate: values.invoiceDate,
      article: values.article,
      quantity: Number(values.quantity),
      author: user || "Морозов Павел"
    });
    if (!receipt.ok) {
      toast(receipt.errors[0], "bad");
      return;
    }
    toast("Позиция накладной добавлена.");
    modal.close();
    ui.section = "receipts";
    paint();
  }
}

function parseLocalDateTime(value) {
  var match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value || "");
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4] || 0), Number(match[5] || 0), 0, 0);
}

function onClick(event) {
  if (event.target.closest("a")) return;
  var button = event.target.closest("[data-act]");
  if (!button) return;
  var act = button.dataset.act;
  if (act === "login") {
    openLogin();
  } else if (act === "logout") {
    setUser(null);
    toast("Вы вышли.");
  } else if (act === "nav") {
    ui.section = button.dataset.section;
    paint();
  } else if (act === "page") {
    ui.skip = Number(button.dataset.skip);
    paint();
  } else if (act === "toggle") {
    ui.openId = ui.openId === button.dataset.id ? null : button.dataset.id;
    paint();
  } else if (act === "reset-filter") {
    ui.filter = { sortBy: "createdAt", sortDir: "desc" };
    ui.skip = 0;
    paint();
  } else if (act === "add-sale") {
    openSaleModal(null);
  } else if (act === "edit-sale") {
    openSaleModal(shop.sales.getObj(button.dataset.id));
  } else if (act === "delete-sale") {
    var sale = shop.sales.getObj(button.dataset.id);
    modal.open({
      kind: "delete-sale",
      title: "Удалить чек № " + sale.id + "?",
      text: sale.productName + ", " + sale.customerName + ".",
      confirm: "Удалить",
      danger: true,
      payload: sale
    });
  } else if (act === "add-customer") {
    modal.open({
      kind: "add-customer",
      title: "Новый покупатель",
      confirm: "Добавить",
      fields: customerFields(null)
    });
  } else if (act === "edit-customer") {
    var customer = shop.directoryCustomers().find(function (item) { return item.id === button.dataset.id; });
    modal.open({ kind: "edit-customer", title: "Карточка покупателя", confirm: "Сохранить", payload: customer, fields: customerFields(customer) });
  } else if (act === "delete-customer") {
    var person = shop.directoryCustomers().find(function (item) { return item.id === button.dataset.id; });
    modal.open({ kind: "delete-customer", title: "Удалить покупателя?", text: person.fullName, confirm: "Удалить", danger: true, payload: person });
  } else if (act === "add-product") {
    modal.open({ kind: "add-product", title: "Новый товар", confirm: "Добавить", fields: productFields(null) });
  } else if (act === "edit-product") {
    var product = shop.directoryProducts().find(function (item) { return item.id === button.dataset.id; });
    modal.open({ kind: "edit-product", title: "Товар", confirm: "Сохранить", payload: product, fields: productFields(product) });
  } else if (act === "delete-product") {
    var item = shop.directoryProducts().find(function (entry) { return entry.id === button.dataset.id; });
    modal.open({ kind: "delete-product", title: "Удалить товар?", text: item.name, confirm: "Удалить", danger: true, payload: item });
  } else if (act === "add-receipt") {
    modal.open({
      kind: "add-receipt",
      title: "Позиция накладной",
      confirm: "Принять",
      fields: [
        { name: "invoiceNumber", label: "Номер накладной", value: "НК-", required: true },
        { name: "invoiceDate", label: "Дата", type: "date", value: DEMO_DATE, required: true },
        { name: "article", label: "Товар", type: "select", value: shop.directoryProducts()[0].article, options: shop.directoryProducts().map(function (entry) {
          return { value: entry.article, label: entry.name + " · " + entry.article };
        }) },
        { name: "quantity", label: "Количество", type: "number", min: "1", step: "1", value: 1, required: true }
      ]
    });
  } else if (act === "run-report") {
    captureReports();
    paint();
  } else if (act === "print") {
    window.print();
  } else if (act === "copy") {
    var text = EXAMPLES[Number(button.dataset.example)];
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("Команда скопирована."); });
    } else {
      toast("Скопируйте команду из блока вручную.", "bad");
    }
  } else if (act === "close-modal") {
    modal.close();
  }
}

function customerFields(customer) {
  return [
    { name: "fullName", label: "ФИО", value: customer ? customer.fullName : "", required: true, wide: true },
    { name: "phone", label: "Телефон", value: customer ? customer.phone : "+375 ", required: true },
    { name: "birthday", label: "День рождения", type: "date", value: customer ? String(customer.birthday).slice(0, 10) : "1995-01-01", required: true }
  ];
}

function productFields(product) {
  return [
    { name: "name", label: "Название", value: product ? product.name : "", required: true },
    { name: "article", label: "Артикул", value: product ? product.article : "", required: true, readOnly: Boolean(product) },
    { name: "category", label: "Вид", type: "select", value: product ? product.category : CATEGORIES[0], options: CATEGORIES.map(function (name) {
      return { value: name, label: name };
    }) },
    { name: "price", label: "Цена, Br", type: "number", min: "0.01", step: "0.01", value: product ? product.price : "", required: true },
    { name: "description", label: "Описание", type: "textarea", wide: true, value: product ? product.description : "" }
  ];
}

function openLogin() {
  modal.open({
    kind: "login",
    title: "Вход",
    text: "Выберите сотрудника. Отдельный пароль не нужен: это учебный вход.",
    confirm: "Войти",
    fields: [
      {
        name: "name",
        label: "Сотрудник",
        type: "select",
        wide: true,
        value: shop.directoryStaff()[0].fullName,
        options: shop.directoryStaff().map(function (person) {
          return { value: person.fullName, label: person.fullName + " · " + person.position };
        })
      }
    ]
  });
}

function onChange(event) {
  if (!modal.root || !modal.root.contains(event.target)) return;
  if (event.target.name === "article" && (modal.kind === "add-sale" || modal.kind === "edit-sale")) {
    var product = findProduct(event.target.value);
    var price = modal.root.querySelector("[name=unitPrice]");
    if (product && price) price.value = product.price;
  }
  if (event.target.name === "article" || event.target.name === "quantity") {
    var description = modal.root.querySelector("[name=description]");
    if (description && description.dataset.auto === "1") {
      var article = modal.root.querySelector("[name=article]").value;
      var quantity = modal.root.querySelector("[name=quantity]").value || 1;
      description.value = draftDescription(article, quantity);
    }
  }
}

function onInput(event) {
  if (event.target.name === "description") event.target.dataset.auto = "";
}

document.body.addEventListener("click", onClick);
document.body.addEventListener("change", onChange);
document.body.addEventListener("input", onInput);
document.body.addEventListener("submit", function (event) {
  if (event.target.id === "filters") {
    event.preventDefault();
    ui.filter = readFilters(event.target);
    ui.skip = 0;
    paint();
  }
  if (event.target.dataset && event.target.dataset.report) {
    event.preventDefault();
    captureReports();
    paint();
  }
  if (event.target.id === "editor") {
    event.preventDefault();
    submitModal();
  }
});
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") modal.close();
});

paint();
var selfCheck = runSelfCheck();
if (selfCheck.some(function (item) { return !item.ok; })) {
  console.warn("Проверка методов нашла расхождения.");
}

  window.salesLab = salesLab;
  window.addObj = addObj;
  window.editObj = editObj;
  window.removeObj = removeObj;
  window.getObjs = getObjs;
  window.getObj = getObj;
  window.validateObj = validateObj;
  window.explainObj = explainObj;
  window.addAll = addAll;
  window.setUser = setUser;
  window.applyFilter = applyFilter;
  window.staffOnDate = staffOnDate;
  window.customersWithDiscount = customersWithDiscount;
  window.birthdaysOn = birthdaysOn;
  window.productDynamics = productDynamics;
})();
