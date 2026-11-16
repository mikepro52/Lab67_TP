function el(tag, props, children) {
  var node = document.createElement(tag);
  Object.keys(props || {}).forEach(function (key) {
    var value = props[key];
    if (value == null || value === false) return;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value === true ? "" : String(value));
  });
  [].concat(children || []).forEach(function (child) {
    if (child == null || child === false) return;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  });
  return node;
}

function formatMoney(value) {
  return new Intl.NumberFormat("ru-BY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value) || 0) + " Br";
}

function formatDate(value, withTime) {
  var date = value instanceof Date ? value : parseDay(value);
  var options = { day: "numeric", month: "long", year: "numeric" };
  if (withTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }
  return new Intl.DateTimeFormat("ru-RU", options).format(date);
}

function formatStamp(date) {
  var pad = function (number) { return String(number).padStart(2, "0"); };
  return {
    day: pad(date.getDate()) + "." + pad(date.getMonth() + 1) + "." + date.getFullYear(),
    time: pad(date.getHours()) + ":" + pad(date.getMinutes())
  };
}

function formatShort(iso) {
  var date = parseDay(iso);
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(date);
}

function plural(count, one, few, many) {
  var n10 = count % 10;
  var n100 = count % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

function telHref(phone) {
  return "tel:" + String(phone).replace(/[^\d+]/g, "");
}

function toLocalInput(date) {
  var value = new Date(date);
  var pad = function (number) { return String(number).padStart(2, "0"); };
  return value.getFullYear() + "-" + pad(value.getMonth() + 1) + "-" + pad(value.getDate()) +
    "T" + pad(value.getHours()) + ":" + pad(value.getMinutes());
}

function saleStory(sale) {
  if (!sale.customerId) return "Покупатель не из справочника, скидка не применяется.";
  if (!sale.hadCard && sale.cardIssued) {
    return "Чек " + formatMoney(sale.gross) + " больше 50 Br, поэтому после этой покупки выдана карта " +
      sale.cardNumber + ". На этот чек скидки ещё нет.";
  }
  if (!sale.hadCard) return "Карты на момент покупки не было, а сумма чека не превысила 50 Br. Скидка 0%.";
  return "До чека накоплено " + formatMoney(sale.accumulatedBefore) + ", карта " + sale.cardNumber +
    ". Скидка " + sale.discountPercent + "%. К оплате " + formatMoney(sale.total) + ".";
}

function tierHint(customer) {
  if (!customer.cardNumber) return "Карта появится после покупки дороже 50 Br.";
  if (customer.accumulated <= 200) return "Скидка 5% начнётся, когда сумма покупок превысит 200 Br.";
  if (customer.accumulated <= 500) return "Скидка 10% начнётся, когда сумма покупок превысит 500 Br.";
  return "Максимальная скидка уже действует.";
}

function thumb(src, title) {
  if (!src) return el("span", { class: "letter", text: String(title || "?").slice(0, 1) });
  var image = el("img", { class: "thumb", src: src, alt: "" });
  image.addEventListener("error", function () {
    image.replaceWith(el("span", { class: "letter", text: String(title || "?").slice(0, 1) }));
  });
  return image;
}

function renderHeader(state) {
  var today = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  var session = state.user
    ? el("div", { class: "session" }, [
      el("div", {}, [
        el("strong", { text: state.user }),
        el("em", { text: state.employee ? state.employee.position : "Пользователь" })
      ]),
      el("button", { type: "button", class: "btn ghost", "data-act": "logout", text: "Выйти" })
    ])
    : el("button", { type: "button", class: "btn light", "data-act": "login", text: "Войти" });
  return el("header", { class: "topbar" }, [
    el("div", { class: "brand" }, [
      el("div", { class: "monogram", text: "М" }),
      el("div", {}, [
        el("p", { class: "logo", text: "Меркурий" }),
        el("p", { class: "logo-sub", text: "АИС «Анализ продаж» · одежда, обувь, кожа" })
      ])
    ]),
    el("div", { class: "userbox" }, [
      el("p", { class: "today", text: today }),
      session
    ])
  ]);
}

function renderNav(state) {
  var items = [
    ["sales", "01", "Журнал", state.collectionSize],
    ["customers", "02", "Покупатели", state.customers.length],
    ["products", "03", "Товары", state.products.length],
    ["receipts", "04", "Накладные", null],
    ["staff", "05", "Сотрудники", state.staff.length],
    ["reports", "06", "Отчёты", null]
  ];
  return el("nav", { class: "nav", "aria-label": "Разделы" }, items.map(function (item) {
    return el("button", {
      type: "button",
      class: "nav-btn",
      "data-act": "nav",
      "data-section": item[0],
      "aria-current": state.section === item[0] ? "page" : null
    }, [
      el("span", { class: "nav-mark", text: item[1] }),
      el("span", { text: item[2] }),
      item[3] == null ? null : el("em", { text: String(item[3]) })
    ]);
  }));
}

function renderPage(state) {
  var pages = {
    sales: renderSales,
    customers: renderCustomers,
    products: renderProducts,
    receipts: renderReceipts,
    staff: renderStaff,
    reports: renderReports
  };
  var section = el("div", { class: "workspace-inner" }, [
    (pages[state.section] || renderSales)(state),
    el("footer", { class: "footer", text: "Лабораторные 6 и 7 · вариант 12. В коллекции " +
      state.collectionSize + " " + plural(state.collectionSize, "продажа", "продажи", "продаж") +
      ". Журнал хранится в localStorage и не пропадает после перезагрузки." })
  ]);
  return section;
}

function guestBanner() {
  return el("p", { class: "banner", text: "Вы не вошли. Кнопки добавления, изменения, удаления и поиска скрыты. Вход — кнопка «Войти» в шапке, это форма." });
}

function renderSales(state) {
  var root = el("section", {});
  root.append(
    el("div", { class: "section-head" }, [
      el("div", {}, [
        el("p", { class: "kicker", text: "Магазин «Меркурий»" }),
        el("h1", { text: "Журнал продаж" }),
        el("p", { class: "lead", text: "Каждая строка — чек. Скидка считается по накопленной сумме до этой покупки и по наличию карты." })
      ]),
      state.user ? el("button", { type: "button", class: "btn", "data-act": "add-sale", text: "Добавить продажу" }) : null
    ]),
    state.user ? el("p", { class: "banner quiet", text: state.user + (state.employee ? " · " + state.employee.position : "") + ". Новую продажу можно провести здесь или командой addObj в консоли." }) : guestBanner(),
    el("div", { class: "kpis" }, [
      kpi("Выручка", formatMoney(state.revenue), "после скидок"),
      kpi("Средний чек", formatMoney(state.average), state.checks + " " + plural(state.checks, "чек", "чека", "чеков")),
      kpi("Дисконтных карт", String(state.cards), "выдаются после чека > 50 Br"),
      kpi("Скидка 10%", String(state.vips), "накоплено больше 500 Br")
    ]),
    el("p", { class: "rule", text: "Покупка дороже 50 Br выдаёт карту на 5 цифр. Пока накоплено не больше 200 Br, скидка 3%. Дальше 5%, а после 500 Br — 10%. На чек, которым карту только что выдали, скидка ещё не действует." })
  );
  if (state.user) root.append(renderFilters(state));
  root.append(renderLedger(state), renderPager(state), renderCheatsheet());
  return root;
}

function kpi(label, value, note) {
  return el("article", { class: "kpi" }, [
    el("span", { text: label }),
    el("b", { text: value }),
    el("small", { text: note })
  ]);
}

function renderFilters(state) {
  var filter = state.filter;
  return el("form", { id: "filters", class: "filters" }, [
    labeled("Поиск", el("input", { name: "query", value: filter.query || "", placeholder: "Описание, товар, клиент" })),
    labeled("Продавец", select("author", authorOptions(state), filter.author || "")),
    labeled("Вид", select("category", [{ value: "", label: "Все виды" }].concat(CATEGORIES.map(function (name) {
      return { value: name, label: name };
    })), filter.category || "")),
    labeled("Артикул", el("input", { name: "article", value: filter.article || "", placeholder: "PL, SH, LG, HS" })),
    labeled("Скидка", select("discount", [
      { value: "", label: "Любая" },
      { value: "0", label: "0%" },
      { value: "3", label: "3%" },
      { value: "5", label: "5%" },
      { value: "10", label: "10%" }
    ], filter.discountPercent == null ? "" : String(filter.discountPercent))),
    labeled("С даты", el("input", { type: "date", name: "dateFrom", value: filter.dateFrom || "" })),
    labeled("По дату", el("input", { type: "date", name: "dateTo", value: filter.dateTo || "" })),
    labeled("Сортировка", select("sortBy", [
      { value: "createdAt", label: "Дата" },
      { value: "total", label: "Сумма" },
      { value: "quantity", label: "Количество" },
      { value: "productName", label: "Товар" },
      { value: "customerName", label: "Покупатель" },
      { value: "author", label: "Продавец" },
      { value: "discountPercent", label: "Скидка" }
    ], filter.sortBy || "createdAt")),
    labeled("Порядок", select("sortDir", [
      { value: "desc", label: "По убыванию" },
      { value: "asc", label: "По возрастанию" }
    ], filter.sortDir || "desc")),
    el("div", { class: "filter-actions" }, [
      el("button", { class: "btn", type: "submit", text: "Найти" }),
      el("button", { class: "btn ghost", type: "button", "data-act": "reset-filter", text: "Сбросить" })
    ])
  ]);
}

function authorOptions(state) {
  return [{ value: "", label: "Все продавцы" }].concat(state.authors.map(function (name) {
    return { value: name, label: name };
  }));
}

function labeled(text, control) {
  return el("label", {}, [el("span", { text: text }), control]);
}

function select(name, options, current) {
  return el("select", { name: name }, options.map(function (option) {
    return el("option", {
      value: option.value,
      text: option.label,
      selected: String(option.value) === String(current)
    });
  }));
}

function renderLedger(state) {
  var head = el("div", { class: "ledger-head" }, [
    el("span", { text: "Когда" }),
    el("span", { text: "Товар" }),
    el("span", { text: "Покупатель" }),
    el("span", { text: "Продавец" }),
    el("span", { text: "Скидка" }),
    el("span", { text: "Сумма" }),
    el("span", { text: "" })
  ]);
  var rows = state.page.map(function (sale) { return renderSale(sale, state); });
  return el("div", { class: "ledger" }, [
    head
  ].concat(rows.length ? rows : [el("div", { class: "empty", text: "По этому запросу продаж нет." })]));
}

function renderSale(sale, state) {
  var open = state.openId === sale.id;
  var row = el("div", {
    class: "ledger-row" + (open ? " is-open" : ""),
    "data-act": "toggle",
    "data-id": sale.id
  }, [
    el("time", { class: "when", datetime: sale.createdAt.toISOString() }, [
      el("b", { text: formatStamp(sale.createdAt).day }),
      el("span", { text: formatStamp(sale.createdAt).time })
    ]),
    el("div", { class: "with-thumb" }, [
      thumb(sale.photoLink || photoFor(sale.category), sale.productName),
      el("div", { class: "product" }, [
        el("strong", { text: sale.productName }),
        el("span", { text: sale.article + " · " + sale.quantity + " шт. · " + sale.category })
      ])
    ]),
    el("div", { class: "who" }, [
      el("strong", { text: sale.customerName }),
      el("a", { href: telHref(sale.customerPhone), text: sale.customerPhone })
    ]),
    el("span", { text: sale.author }),
    el("span", { class: "pill pill-" + sale.discountPercent, text: sale.discountPercent + "%" }),
    el("div", { class: "sum" }, [
      el("strong", { text: formatMoney(sale.total) }),
      sale.discountPercent ? el("s", { text: formatMoney(sale.gross) }) : null
    ]),
    state.user ? el("div", { class: "row-actions" }, [
      el("button", { type: "button", class: "text-btn", "data-act": "edit-sale", "data-id": sale.id, text: "Изменить" }),
      el("button", { type: "button", class: "text-btn danger", "data-act": "delete-sale", "data-id": sale.id, text: "Удалить" })
    ]) : el("span")
  ]);
  if (!open) return row;
  var detail = el("div", { class: "detail" }, [
    el("img", { src: sale.photoLink || photoFor(sale.category), alt: "" }),
    el("div", {}, [
      el("p", { text: sale.description }),
      el("p", { text: saleStory(sale) }),
      el("p", { text: "id " + sale.id + (sale.cardIssued ? " · карта выдана этим чеком" : "") })
    ])
  ]);
  return el("div", {}, [row, detail]);
}

function renderPager(state) {
  if (!state.total) return el("div");
  var pages = Math.ceil(state.total / state.top);
  var current = Math.floor(state.skip / state.top);
  var buttons = [];
  buttons.push(el("button", {
    type: "button",
    class: "text-btn",
    "data-act": "page",
    "data-skip": String(Math.max(0, state.skip - state.top)),
    disabled: current === 0,
    text: "Назад"
  }));
  for (var index = 0; index < pages; index += 1) {
    buttons.push(el("button", {
      type: "button",
      class: "text-btn page-btn",
      "data-act": "page",
      "data-skip": String(index * state.top),
      "aria-current": index === current ? "page" : null,
      text: String(index + 1)
    }));
  }
  buttons.push(el("button", {
    type: "button",
    class: "text-btn",
    "data-act": "page",
    "data-skip": String(Math.min((pages - 1) * state.top, state.skip + state.top)),
    disabled: current >= pages - 1,
    text: "Дальше"
  }));
  var from = state.skip + 1;
  var to = Math.min(state.skip + state.top, state.total);
  return el("div", { class: "pager" }, [
    el("span", { text: "Показаны " + from + "–" + to + " из " + state.total })
  ].concat(buttons));
}

function renderCheatsheet() {
  var examples = [
    ["Первая страница, новые сверху", "getObjs(0, 10)"],
    ["Вторая страница", "getObjs(10, 10)"],
    ["Фильтр по автору", "getObjs(0, 10, { author: 'Соколова Мария' })"],
    ["Фильтр по описанию", "getObjs(0, 10, { description: 'пальто' })"],
    ["Вид и сортировка по сумме", "getObjs(0, 10, { category: 'Обувь', sortBy: 'total', sortDir: 'desc' })"],
    ["Одна продажа", "getObj('36')"],
    ["Невалидный объект", "validateObj({ id: 'x', description: '', createdAt: '2026-11-16', author: '' })"],
    ["Почему не прошёл проверку", "explainObj({ id: 'x', description: 'Коротко', createdAt: new Date(), author: 'Соколова Мария' })"],
    ["Добавить чек", "addObj({\n  id: '101',\n  description: 'Пальто шерстяное, арт. PL-104, 1 шт. Клиент: Орлова Дарья Игоревна.',\n  createdAt: new Date(),\n  author: 'Соколова Мария',\n  photoLink: 'img/clothing.svg',\n  productName: 'Пальто шерстяное',\n  article: 'PL-104',\n  category: 'Одежда',\n  quantity: 1,\n  unitPrice: 189,\n  customerId: 'c3',\n  customerName: 'Орлова Дарья Игоревна',\n  customerPhone: '+375 29 445-10-77'\n})"],
    ["Изменить описание", "editObj('101', { description: 'Пальто после примерки, арт. PL-104, 1 шт.' })"],
    ["Удалить", "removeObj('101')"],
    ["Скрыть кнопки", "setUser(null)"],
    ["Вернуть директора", "setUser('Новик Сергей')"],
    ["Кто работал 16 ноября", "staffOnDate('2026-11-16')"],
    ["Клиенты со скидкой 10%", "customersWithDiscount('2026-11-16')"],
    ["Именинники", "birthdaysOn('2026-11-16')"],
    ["Поступление и продажа пальто", "productDynamics('PL-104', '2026-08-01', '2026-11-30')"],
    ["Вернуть исходный журнал", "salesLab.reset()"]
  ];
  EXAMPLES = examples.map(function (item) { return item[1]; });
  return el("details", { class: "sheet" }, [
    el("summary", { text: "Команды для консоли" }),
    el("p", { class: "lead", text: "Команды шестой лабораторной. Журнал после них пишется в localStorage (ключ ObjInf). Объект salesLab содержит те же функции." })
  ].concat(examples.map(function (example, index) {
    return el("div", { class: "example" }, [
      el("pre", { text: example[1] }),
      el("button", { type: "button", class: "text-btn", "data-act": "copy", "data-example": String(index), text: "Копировать" })
    ]);
  })));
}

function renderCustomers(state) {
  return el("section", {}, [
    head("Покупатели", "Карты и скидки", "Постоянные клиенты. Процент на карточке — тот, который действует на следующую покупку.", state.user && el("button", { type: "button", class: "btn", "data-act": "add-customer", text: "Добавить покупателя" })),
    state.user ? null : guestBanner(),
    el("p", { class: "rule", text: "Накоплено — сумма покупок до скидки. Карта из пяти цифр появляется после чека дороже 50 Br." }),
    el("div", { class: "cards" }, state.customers.map(function (customer) {
      return el("article", { class: "dcard tier-" + customer.discountPercent }, [
        el("span", { text: customer.cardNumber ? "дисконтная карта" : "без карты" }),
        el("b", { text: customer.discountPercent + "%" }),
        el("div", { class: "num", text: customer.cardNumber || "—" }),
        el("strong", { text: customer.fullName }),
        el("a", { href: telHref(customer.phone), text: customer.phone }),
        el("p", { text: "День рождения " + formatDate(customer.birthday) }),
        el("p", { text: "Накоплено " + formatMoney(customer.accumulated) + " · " + customer.purchases + " " + plural(customer.purchases, "покупка", "покупки", "покупок") }),
        el("p", { text: tierHint(customer) }),
        state.user ? el("div", { class: "card-actions" }, [
          el("button", { type: "button", class: "text-btn", "data-act": "edit-customer", "data-id": customer.id, text: "Изменить" }),
          el("button", { type: "button", class: "text-btn danger", "data-act": "delete-customer", "data-id": customer.id, text: "Удалить" })
        ]) : null
      ]);
    }))
  ]);
}

function renderProducts(state) {
  var groups = [];
  CATEGORIES.concat(extraCategories(state.products)).forEach(function (category) {
    var items = state.products.filter(function (product) { return product.category === category; });
    if (!items.length) return;
    groups.push(el("div", { class: "category-block" }, [
      el("h2", { text: category }),
      el("div", { class: "cards" }, items.map(function (product) { return productCard(product, state); }))
    ]));
  });
  return el("section", {}, [
    head("Товары", "Склад", "Остаток = поступления по накладным минус продажи. Цену в старых чеках правка каталога не меняет.", state.user && el("button", { type: "button", class: "btn", "data-act": "add-product", text: "Добавить товар" })),
    state.user ? null : guestBanner()
  ].concat(groups));
}

function extraCategories(products) {
  var known = {};
  CATEGORIES.forEach(function (name) { known[name] = true; });
  var extra = [];
  products.forEach(function (product) {
    if (!known[product.category]) {
      known[product.category] = true;
      extra.push(product.category);
    }
  });
  return extra;
}

function productCard(product, state) {
  return el("article", { class: "product-card" }, [
    el("img", { src: product.photoLink, alt: "" }),
    el("p", { class: "kicker", text: product.article }),
    el("h3", { text: product.name }),
    el("p", { text: product.description }),
    el("p", { class: "price", text: formatMoney(product.price) }),
    el("p", {}, [
      el("span", { class: product.stock > 0 ? "stock-ok" : "stock-bad", text: "На складе " + product.stock }),
      " · пришло " + product.received + ", продано " + product.sold
    ]),
    state.user ? el("div", { class: "card-actions" }, [
      el("button", { type: "button", class: "text-btn", "data-act": "edit-product", "data-id": product.id, text: "Изменить" }),
      product.received + product.sold === 0 ? el("button", { type: "button", class: "text-btn danger", "data-act": "delete-product", "data-id": product.id, text: "Удалить" }) : null
    ]) : null
  ]);
}

function renderReceipts(state) {
  var groups = {};
  var order = [];
  state.receipts.forEach(function (receipt) {
    if (!groups[receipt.invoiceNumber]) {
      groups[receipt.invoiceNumber] = [];
      order.push(receipt.invoiceNumber);
    }
    groups[receipt.invoiceNumber].push(receipt);
  });
  return el("section", {}, [
    head("Накладные", "Поступление", "Товаровед принимает товар по накладной. У одной накладной может быть несколько позиций.", state.user && el("button", { type: "button", class: "btn", "data-act": "add-receipt", text: "Добавить позицию" })),
    state.user ? null : guestBanner()
  ].concat(order.map(function (number) {
    var lines = groups[number];
    return el("article", { class: "group" }, [
      el("header", {}, [
        el("h3", { text: number }),
        el("span", { text: formatDate(lines[0].createdAt) + " · " + lines[0].author })
      ])
    ].concat(lines.map(function (line) {
      return el("div", { class: "line" }, [
        el("span", { text: line.productName + " · " + line.article }),
        el("strong", { text: line.quantity + " шт." })
      ]);
    })));
  })));
}

function renderStaff(state) {
  return el("section", {}, [
    head("Сотрудники", "Смены", "Часы на конкретную дату собраны в отчёте. Здесь — кто работает в магазине и какие смены уже внесены.", null),
    el("div", { class: "people" }, state.staff.map(function (person) {
      return el("article", { class: "person" }, [
        el("p", { class: "kicker", text: person.position }),
        el("h3", { text: person.fullName }),
        el("a", { href: telHref(person.phone), text: person.phone }),
        el("p", { text: "В журнале смен " + person.hoursTotal + " " + plural(person.hoursTotal, "час", "часа", "часов") }),
        el("div", { class: "shifts" }, person.shifts.map(function (shift) {
          return el("span", { text: formatShort(shift.date) + " · " + shift.hours + " ч" });
        }))
      ]);
    }))
  ]);
}

function renderReports(state) {
  return el("section", {}, [
    head("Отчёты", "Для руководителя", "Четыре обработки из варианта: смена на дату, клиенты со скидкой 10%, динамика товара и именинники.", el("button", { type: "button", class: "btn ghost", "data-act": "print", text: "Печать" })),
    el("div", { class: "report-grid" }, [
      staffReport(state),
      vipReport(state),
      dynamicsReport(state),
      birthdayReport(state)
    ])
  ]);
}

function staffReport(state) {
  var report = state.reports.staff;
  return el("article", { class: "panel", id: "report-staff" }, [
    el("h2", { text: "Кто работал" }),
    el("p", { text: "На заданную дату: продавцы и остальные сотрудники, с часами смены." }),
    el("form", { class: "controls", "data-report": "staff" }, [
      el("input", { type: "date", id: "report-staff-date", value: state.reportInputs.staffDate }),
      el("button", { type: "submit", class: "btn", text: "Сформировать" })
    ]),
    report.ok ? el("div", {}, [
      el("p", { text: report.count + " " + plural(report.count, "человек", "человека", "человек") + ", всего " + report.totalHours + " " + plural(report.totalHours, "час", "часа", "часов") + "." }),
      el("h3", { text: "Продавцы · " + report.sellers.length }),
      peopleList(report.sellers),
      el("h3", { text: "Остальные · " + report.others.length }),
      peopleList(report.others)
    ]) : el("p", { text: report.message })
  ]);
}

function peopleList(list) {
  if (!list.length) return el("p", { text: "Никого." });
  return el("div", { class: "report-list" }, list.map(function (person) {
    return el("div", {}, [
      el("span", { text: person.fullName + " · " + person.position }),
      el("strong", { text: person.hours + " ч" })
    ]);
  }));
}

function vipReport(state) {
  var report = state.reports.vip;
  return el("article", { class: "panel", id: "report-vip" }, [
    el("h2", { text: "Скидка 10%" }),
    el("p", { text: "Покупатели, у которых на эту дату сумма покупок уже больше 500 Br и карта выдана." }),
    el("form", { class: "controls", "data-report": "vip" }, [
      el("input", { type: "date", id: "report-vip-date", value: state.reportInputs.discountDate }),
      el("button", { type: "submit", class: "btn", text: "Сформировать" })
    ]),
    report.ok ? el("div", {}, [
      el("p", { text: report.count + " " + plural(report.count, "покупатель", "покупателя", "покупателей") + "." }),
      report.list.length ? el("div", { class: "report-list" }, report.list.map(function (person) {
        return el("div", {}, [
          el("span", { text: person.fullName + " · " + person.phone }),
          el("strong", { text: person.cardNumber + " · " + formatMoney(person.accumulated) })
        ]);
      })) : el("p", { text: "На эту дату таких покупателей ещё нет." })
    ]) : el("p", { text: report.message })
  ]);
}

function birthdayReport(state) {
  var report = state.reports.birthdays;
  return el("article", { class: "panel", id: "report-birthdays" }, [
    el("h2", { text: "Дни рождения" }),
    el("p", { text: "Список покупателей, у которых день рождения приходится на выбранную дату." }),
    el("form", { class: "controls", "data-report": "birthdays" }, [
      el("input", { type: "date", id: "report-bday-date", value: state.reportInputs.birthdayDate }),
      el("button", { type: "submit", class: "btn", text: "Сформировать" })
    ]),
    report.ok ? el("div", {}, [
      report.list.length ? el("div", { class: "report-list" }, report.list.map(function (person) {
        return el("div", {}, [
          el("span", { text: person.fullName }),
          el("strong", { text: person.phone + " · " + person.age + " " + plural(person.age, "год", "года", "лет") })
        ]);
      })) : el("p", { text: "В этот день именинников нет." })
    ]) : el("p", { text: report.message })
  ]);
}

function dynamicsReport(state) {
  var report = state.reports.dynamics;
  var max = 1;
  if (report.ok) {
    report.months.forEach(function (month) { max = Math.max(max, month.received, month.sold); });
  }
  return el("article", { class: "panel", id: "report-dynamics" }, [
    el("h2", { text: "Динамика товара" }),
    el("p", { text: "За период, по месяцам: сколько пришло по накладным и сколько продано." }),
    el("form", { class: "controls", "data-report": "dynamics" }, [
      el("select", { id: "report-article" }, state.products.map(function (product) {
        return el("option", {
          value: product.article,
          text: product.article + " · " + product.name,
          selected: product.article === state.reportInputs.article
        });
      })),
      el("input", { type: "date", id: "report-from", value: state.reportInputs.from }),
      el("input", { type: "date", id: "report-to", value: state.reportInputs.to }),
      el("button", { type: "submit", class: "btn", text: "Сформировать" })
    ]),
    report.ok ? el("div", {}, [
      el("p", { text: report.productName + ": пришло " + report.received + ", продано " + report.sold + "." }),
      el("div", { class: "legend" }, [
        el("span", {}, [el("b"), "поступление"]),
        el("span", {}, [el("b", { class: "sale" }), "продажа"])
      ]),
      el("div", { class: "bars" }, report.months.map(function (month) {
        return el("div", { class: "bar-row" }, [
          el("span", { text: month.label }),
          el("div", {}, [meter("in", month.received, max), meter("out", month.sold, max)])
        ]);
      }))
    ]) : el("p", { text: report.message })
  ]);
}

function meter(kind, value, max) {
  var fill = el("span");
  fill.style.width = (value / max * 100) + "%";
  return el("div", { class: "bar " + kind }, [
    el("i", {}, [fill]),
    el("em", { text: String(value) })
  ]);
}

function head(title, kicker, lead, action) {
  return el("div", { class: "section-head" }, [
    el("div", {}, [
      el("p", { class: "kicker", text: kicker }),
      el("h1", { text: title }),
      el("p", { class: "lead", text: lead })
    ]),
    action || null
  ]);
}

var EXAMPLES = [];

class ModalView {
  constructor() {
    this.root = null;
    this.kind = "";
    this.payload = null;
  }

  open(config) {
    this.close();
    this.kind = config.kind;
    this.payload = config.payload || null;
    var panel = el("div", { class: "modal", role: "dialog", "aria-modal": "true" }, [
      el("h2", { text: config.title }),
      config.text ? el("p", { text: config.text }) : null,
      el("p", { id: "modal-errors", class: "errors", hidden: true }),
      el("form", { id: "editor" }, [
        config.fields ? el("div", { class: "form-grid" }, config.fields.map(fieldBlock)) : null,
        el("div", { class: "modal-actions" }, [
          el("button", { type: "button", class: "btn ghost", "data-act": "close-modal", text: "Отмена" }),
          el("button", { type: "submit", class: config.danger ? "btn danger" : "btn", text: config.confirm || "Сохранить" })
        ])
      ])
    ]);
    this.root = el("div", { class: "modal-back" }, [panel]);
    var self = this;
    this.root.addEventListener("click", function (event) {
      if (event.target === self.root) self.close();
    });
    document.body.append(this.root);
    document.body.classList.add("modal-open");
    var focus = this.root.querySelector("input:not([readonly]), select, textarea");
    if (focus) focus.focus();
  }

  close() {
    if (this.root) this.root.remove();
    this.root = null;
    document.body.classList.remove("modal-open");
  }

  values() {
    var form = this.root && this.root.querySelector("form");
    if (!form) return {};
    var result = {};
    new FormData(form).forEach(function (value, key) { result[key] = String(value); });
    return result;
  }
}

function fieldBlock(field) {
  return el("label", { class: "field" + (field.wide ? " wide" : "") }, [
    el("span", { text: field.label }),
    control(field),
    field.hint ? el("small", { text: field.hint }) : null
  ]);
}

function control(field) {
  if (field.type === "select") return select(field.name, field.options, field.value || "");
  if (field.type === "textarea") {
    var area = el("textarea", { name: field.name, maxlength: "199" });
    area.value = field.value || "";
    if (field.auto) area.dataset.auto = "1";
    return area;
  }
  var input = el("input", {
    name: field.name,
    type: field.type || "text",
    value: field.value == null ? "" : String(field.value),
    step: field.step || null,
    min: field.min || null,
    readonly: field.readOnly || null,
    required: field.required || null
  });
  return input;
}

var toastTimer = null;

function toast(message, kind) {
  var node = document.getElementById("toast");
  if (!node) {
    node = el("div", { id: "toast", role: "status" });
    document.body.append(node);
  }
  node.className = "toast" + (kind === "bad" ? " bad" : "");
  node.textContent = message;
  var errors = document.getElementById("modal-errors");
  if (errors && kind === "bad") {
    errors.hidden = false;
    errors.textContent = message;
  }
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { node.remove(); }, 3200);
}
