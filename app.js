const MIN_AMOUNT = 200_000_000;
const PASSENGER_LABELS = [
  "Chở người",
  "Xe KD Hợp đồng (KD chở người - khách du lịch,...)"
];

const state = {
  vehicleOptions: [],
  vcxRates: [],
  dkbsRates: [],
  tndsRates: []
};

const els = {
  usage: document.getElementById("usage"),
  vehicleType: document.getElementById("vehicleType"),
  vehicleValue: document.getElementById("vehicleValue"),
  insuredValue: document.getElementById("insuredValue"),
  startDate: document.getElementById("startDate"),
  endDate: document.getElementById("endDate"),
  durationMonths: document.getElementById("durationMonths"),
  manufactureYear: document.getElementById("manufactureYear"),
  usageYears: document.getElementById("usageYears"),
  seatCount: document.getElementById("seatCount"),
  payload: document.getElementById("payload"),
  dkbsInput: document.getElementById("dkbsInput"),
  tndsParticipation: document.getElementById("tndsParticipation"),
  calculateButton: document.getElementById("calculateButton"),
  clearButton: document.getElementById("clearButton"),
  statusBox: document.getElementById("statusBox"),
  tndsWarning: document.getElementById("tndsWarning"),

  summaryUsage: document.getElementById("summaryUsage"),
  summaryVehicleType: document.getElementById("summaryVehicleType"),
  summaryUsageYears: document.getElementById("summaryUsageYears"),
  summaryInsuredValue: document.getElementById("summaryInsuredValue"),
  summaryVcxRate: document.getElementById("summaryVcxRate"),
  summaryDkbsRate: document.getElementById("summaryDkbsRate"),
  summaryTndsFee: document.getElementById("summaryTndsFee"),

  vcxFeeText: document.getElementById("vcxFeeText"),
  dkbsFeeText: document.getElementById("dkbsFeeText"),
  tndsFeeText: document.getElementById("tndsFeeText"),
  grandTotalText: document.getElementById("grandTotalText"),
  totalWithTndsText: document.getElementById("totalWithTndsText"),

  selectedDkbsChips: document.getElementById("selectedDkbsChips"),
  dkbsDetails: document.getElementById("dkbsDetails")
};

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeCode(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function parseJsonNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let raw = String(value).trim();

  if (!raw || raw === "-") {
    return 0;
  }

  raw = raw.replace(/\s+/g, "");

  if (raw.includes(",") && raw.includes(".")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(",")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else {
    raw = raw.replace(/,/g, "");
  }

  const result = Number(raw);
  return Number.isFinite(result) ? result : 0;
}

function parseInputNumber(value) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function formatInteger(value) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatRate(value) {
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function formatInputNumber(input) {
  if (!input) {
    return;
  }

  const value = parseInputNumber(input.value);
  input.value = value ? formatInteger(value) : "";
}

function setText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function setStatus(message, isError = false) {
  if (!els.statusBox) {
    return;
  }

  els.statusBox.textContent = message;
  els.statusBox.className = isError ? "status error" : "status ok";
}

function showPopup(message) {
  window.alert(message);
}

function showTndsWarning(show) {
  if (!els.tndsWarning) {
    return;
  }

  els.tndsWarning.style.display = show ? "block" : "none";
  els.tndsWarning.textContent = "Phí TNDS chỉ tính cho 1 năm.";
}

function getField(row, keys, fallback = "") {
  for (const key of keys) {
    if (
      Object.prototype.hasOwnProperty.call(row, key) &&
      row[key] !== null &&
      row[key] !== undefined &&
      row[key] !== ""
    ) {
      return row[key];
    }
  }
  return fallback;
}

function inRange(value, fromValue, toValue) {
  const v = Number(value);
  const from = Number(fromValue);
  const to = Number(toValue);
  return v >= from && v <= to;
}

async function loadJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Không đọc được file ${path}`);
  }

  return await response.json();
}

function monthDiffExcelLike(startValue, endValue) {
  if (!startValue || !endValue) {
    return 0;
  }

  const start = new Date(startValue);
  const end = new Date(endValue);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  const months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  const extra = end.getDate() > start.getDate() ? 1 : 0;
  return months + extra;
}

function updateDurationMonths() {
  const months = monthDiffExcelLike(els.startDate?.value, els.endDate?.value);

  if (els.durationMonths) {
    els.durationMonths.value = months ? String(months) : "";
  }

  return months;
}

function updateUsageYears() {
  const manufactureYear = Number(els.manufactureYear?.value || 0);
  const currentYear = new Date().getFullYear();

  if (!manufactureYear || manufactureYear > currentYear) {
    if (els.usageYears) {
      els.usageYears.value = "";
    }
    return 0;
  }

  const usageYears = currentYear - manufactureYear;

  if (els.usageYears) {
    els.usageYears.value = String(usageYears);
  }

  return usageYears;
}

function getSelectedVehicle() {
  const selectedId = els.vehicleType?.value ?? "";
  return state.vehicleOptions.find((item) => String(item.id) === String(selectedId)) || null;
}

function isPassengerVehicleLabel(label) {
  const normalized = normalizeText(label);
  return PASSENGER_LABELS.some((item) => normalizeText(item) === normalized);
}

function requiresSeatCount(selectedVehicle) {
  if (!selectedVehicle) {
    return false;
  }

  return isPassengerVehicleLabel(selectedVehicle.vehicle_label);
}

function getVehicleCandidates(selectedVehicle) {
  if (!selectedVehicle) {
    return [];
  }

  const candidates = new Set([
    normalizeText(selectedVehicle.id),
    normalizeText(selectedVehicle.vehicle_label),
    normalizeText(selectedVehicle.vehicle_code),
    normalizeText(selectedVehicle.vehicle_name),
    normalizeText(selectedVehicle.vcx_code),
    normalizeText(selectedVehicle.vcx_name),
    normalizeText(selectedVehicle.tnds_code),
    normalizeText(selectedVehicle.tnds_name),
    normalizeText(selectedVehicle.group_code)
  ]);

  return [...candidates].filter(Boolean);
}

function vehicleMatches(rowValues, selectedVehicle) {
  const rowCandidates = rowValues.map((value) => normalizeText(value)).filter(Boolean);
  const selectedCandidates = getVehicleCandidates(selectedVehicle);
  return rowCandidates.some((value) => selectedCandidates.includes(value));
}

function renderVehicleOptions(usage) {
  if (!els.vehicleType) {
    return;
  }

  els.vehicleType.innerHTML = '<option value="">Chọn loại xe</option>';

  if (!usage) {
    els.vehicleType.disabled = true;
    return;
  }

  const filtered = state.vehicleOptions.filter((item) => {
    return normalizeCode(item.usage) === normalizeCode(usage) && item.active !== false;
  });

  for (const item of filtered) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.vehicle_label;
    els.vehicleType.appendChild(option);
  }

  els.vehicleType.disabled = false;
}

function getFormData() {
  const selectedVehicle = getSelectedVehicle();

  return {
    usage: els.usage?.value ?? "",
    selectedVehicle,
    vehicleValue: parseInputNumber(els.vehicleValue?.value),
    insuredValue: parseInputNumber(els.insuredValue?.value),
    startDate: els.startDate?.value ?? "",
    endDate: els.endDate?.value ?? "",
    durationMonths: Number(els.durationMonths?.value || 0),
    manufactureYear: Number(els.manufactureYear?.value || 0),
    usageYears: Number(els.usageYears?.value || 0),
    seatCount: Number(els.seatCount?.value || 0),
    payload: Number(els.payload?.value || 0),
    dkbsText: els.dkbsInput?.value ?? "",
    tndsParticipation: normalizeCode(els.tndsParticipation?.value ?? "NO")
  };
}

function validateForm(data) {
  const currentYear = new Date().getFullYear();

  if (!data.usage) {
    return "Bạn chưa chọn mục đích sử dụng.";
  }

  if (!data.selectedVehicle) {
    return "Bạn chưa chọn loại xe.";
  }

  if (data.vehicleValue < MIN_AMOUNT) {
    return "Giá trị xe phải lớn hơn hoặc bằng 200.000.000.";
  }

  if (data.insuredValue < MIN_AMOUNT) {
    return "Tiền bảo hiểm phải lớn hơn hoặc bằng 200.000.000.";
  }

  if (!data.startDate || !data.endDate) {
    return "Bạn chưa nhập đầy đủ thời hạn bảo hiểm.";
  }

  if (data.durationMonths < 6) {
    return "Thời hạn tham gia phải từ 6 tháng trở lên.";
  }

  if (!data.manufactureYear || data.manufactureYear < 1900 || data.manufactureYear > currentYear) {
    return "Năm sản xuất không hợp lệ.";
  }

  if (data.usageYears < 0) {
    return "Năm sử dụng không hợp lệ.";
  }

  const isPassenger = isPassengerVehicleLabel(data.selectedVehicle.vehicle_label);

  if (isPassenger && data.seatCount <= 0) {
    return "Bắt buộc điền số chỗ ngồi cho loại xe này.";
  }

  if (data.tndsParticipation === "YES") {
    if (isPassenger) {
      if (data.seatCount <= 0) {
        return "TNDS: Bắt buộc điền số chỗ ngồi cho loại xe này.";
      }
    } else if (data.payload <= 0) {
      return "TNDS: Bắt buộc điền trọng tải cho loại xe này.";
    }
  }

  return null;
}

function findVcxRow(data) {
  return state.vcxRates.find((row) => {
    const usageOk = normalizeCode(getField(row, ["usage"], "")) === normalizeCode(data.usage);
    const vehicleOk = vehicleMatches(
      [
        getField(row, ["vehicle_label"], ""),
        getField(row, ["vehicle_name"], ""),
        getField(row, ["vehicle_code"], "")
      ],
      data.selectedVehicle
    );

    const insuredFrom = parseJsonNumber(getField(row, ["insured_value_from"], 0));
    const insuredTo = parseJsonNumber(getField(row, ["insured_value_to"], Number.MAX_SAFE_INTEGER));
    const yearFrom = parseJsonNumber(getField(row, ["usage_year_from"], 0));
    const yearTo = parseJsonNumber(getField(row, ["usage_year_to"], 999));
    const seatFrom = parseJsonNumber(getField(row, ["seat_from"], 0));
    const seatTo = parseJsonNumber(getField(row, ["seat_to"], 999));

    return (
      usageOk &&
      vehicleOk &&
      inRange(data.insuredValue, insuredFrom, insuredTo) &&
      inRange(data.usageYears, yearFrom, yearTo) &&
      inRange(data.seatCount, seatFrom, seatTo)
    );
  }) || null;
}

function getPartialFactor(months) {
  if (months <= 0) return 0;
  if (months <= 3) return 0.35;
  if (months <= 6) return 0.6;
  if (months <= 9) return 0.85;
  return 1;
}

function getDurationFactor(durationMonths) {
  if (!durationMonths || durationMonths < 6) {
    return { valid: false, factor: 0, message: "Thời hạn tham gia phải từ 6 tháng trở lên." };
  }

  const fullYears = Math.floor(durationMonths / 12);
  const remainingMonths = durationMonths % 12;

  if (durationMonths <= 12) {
    return {
      valid: true,
      factor: getPartialFactor(durationMonths),
      message: ""
    };
  }

  return {
    valid: true,
    factor: fullYears + getPartialFactor(remainingMonths),
    message: ""
  };
}

function parseDkbsCodes(value) {
  return String(value ?? "")
    .split(";")
    .map((item) => normalizeCode(item))
    .filter(Boolean);
}

function findDkbsRow(data, code) {
  return state.dkbsRates.find((row) => {
    const codeOk = normalizeCode(getField(row, ["dkbs_code"], "")) === code;
    const insuredFrom = parseJsonNumber(getField(row, ["vehicle_value_from", "insured_value_from"], 0));
    const insuredTo = parseJsonNumber(getField(row, ["vehicle_value_to", "insured_value_to"], Number.MAX_SAFE_INTEGER));
    const yearFrom = parseJsonNumber(getField(row, ["usage_year_from"], 0));
    const yearTo = parseJsonNumber(getField(row, ["usage_year_to"], 999));
    const seatFrom = parseJsonNumber(getField(row, ["seat_from"], 0));
    const seatTo = parseJsonNumber(getField(row, ["seat_to"], 999));

    return (
      codeOk &&
      inRange(data.insuredValue, insuredFrom, insuredTo) &&
      inRange(data.usageYears, yearFrom, yearTo) &&
      inRange(data.seatCount, seatFrom, seatTo)
    );
  }) || null;
}

function calculateDkbs(data) {
  const codes = parseDkbsCodes(data.dkbsText);
  const details = [];
  let totalRate = 0;
  let totalFixed = 0;

  for (const code of codes) {
    const row = findDkbsRow(data, code);

    if (!row) {
      details.push({
        code,
        name: `Không tìm thấy mã ${code}`,
        type: "NOT_FOUND",
        value: 0,
        fee: 0,
        message: ""
      });
      continue;
    }

    const type = normalizeCode(getField(row, ["value_type"], "RATE"));
    const value = parseJsonNumber(getField(row, ["value"], 0));
    const message = getField(row, ["message"], "");
    const name = getField(row, ["dkbs_name"], code);

    if (type === "BLOCK") {
      return {
        blocked: true,
        message: message || `ĐKBS ${code}: Không phân cấp / Check lại bảng.`,
        codes,
        details: [
          {
            code,
            name,
            type,
            value,
            fee: 0,
            message
          }
        ],
        totalRate: 0,
        totalFixed: 0
      };
    }

    if (type === "FIXED") {
      totalFixed += value;
    } else {
      totalRate += value;
    }

    details.push({
      code,
      name,
      type,
      value,
      fee: type === "FIXED" ? value : (data.insuredValue * value) / 100,
      message
    });
  }

  return {
    blocked: false,
    message: "",
    codes,
    details,
    totalRate,
    totalFixed
  };
}

function findTndsRow(data) {
  return state.tndsRates.find((row) => {
    const usageOk = normalizeCode(getField(row, ["usage"], "")) === normalizeCode(data.usage);
    const vehicleOk = vehicleMatches(
      [
        getField(row, ["vehicle_label"], ""),
        getField(row, ["vehicle_name"], ""),
        getField(row, ["vehicle_code"], "")
      ],
      data.selectedVehicle
    );

    const isPassenger = isPassengerVehicleLabel(data.selectedVehicle?.vehicle_label || "");

    if (isPassenger) {
      const seatCount = parseJsonNumber(getField(row, ["seat_count"], 0));
      return usageOk && vehicleOk && seatCount === data.seatCount;
    }

    const payloadFrom = parseJsonNumber(getField(row, ["payload_from"], 0));
    const payloadTo = parseJsonNumber(getField(row, ["payload_to"], Number.MAX_SAFE_INTEGER));

    return usageOk && vehicleOk && inRange(data.payload, payloadFrom, payloadTo);
  }) || null;
}

function clearSummary() {
  setText(els.summaryUsage, "-");
  setText(els.summaryVehicleType, "-");
  setText(els.summaryUsageYears, "-");
  setText(els.summaryInsuredValue, "-");
  setText(els.summaryVcxRate, "-");
  setText(els.summaryDkbsRate, "-");
  setText(els.summaryTndsFee, "-");

  setText(els.vcxFeeText, "0");
  setText(els.dkbsFeeText, "0");
  setText(els.tndsFeeText, "0");
  setText(els.grandTotalText, "0");
  setText(els.totalWithTndsText, "0");

  if (els.selectedDkbsChips) {
    els.selectedDkbsChips.innerHTML = "";
  }

  if (els.dkbsDetails) {
    els.dkbsDetails.innerHTML = "";
  }

  showTndsWarning(false);
}

function renderDkbs(result) {
  if (els.selectedDkbsChips) {
    els.selectedDkbsChips.innerHTML = result.codes.length
      ? result.codes.map((code) => `<span class="chip">${code}</span>`).join("")
      : '<span class="chip">Không chọn ĐKBS</span>';
  }

  if (!els.dkbsDetails) {
    return;
  }

  if (!result.details.length) {
    els.dkbsDetails.innerHTML = "<li>Không chọn điều khoản bổ sung.</li>";
    return;
  }

  els.dkbsDetails.innerHTML = result.details
    .map((item) => {
      if (item.type === "NOT_FOUND") {
        return `<li><strong>${item.code}</strong>: Không tìm thấy</li>`;
      }

      if (item.type === "FIXED") {
        return `<li><strong>${item.code}</strong>: ${item.name} — Cố định ${formatInteger(item.value)}</li>`;
      }

      if (item.type === "RATE") {
        return `<li><strong>${item.code}</strong>: ${item.name} — ${formatRate(item.value)}%</li>`;
      }

      return `<li><strong>${item.code}</strong>: ${item.name} — ${item.message || "Không phân cấp"}</li>`;
    })
    .join("");
}

function updateSummary(data) {
  setText(els.summaryUsage, data.usage || "-");
  setText(els.summaryVehicleType, data.selectedVehicle?.vehicle_label || "-");
  setText(els.summaryUsageYears, String(data.usageYears || 0));
  setText(els.summaryInsuredValue, formatInteger(data.insuredValue || 0));
  setText(els.summaryVcxRate, data.vcxRate ? `${formatRate(data.vcxRate)} %` : "-");
  setText(
    els.summaryDkbsRate,
    data.dkbsRate > 0
      ? `${formatRate(data.dkbsRate)} %`
      : data.dkbsFixed > 0
        ? `Cố định ${formatInteger(data.dkbsFixed)}`
        : "-"
  );
  setText(els.summaryTndsFee, data.tndsFee ? formatInteger(data.tndsFee) : "-");

  setText(els.vcxFeeText, formatInteger(data.totalVcxFee));
  setText(els.dkbsFeeText, formatInteger(data.dkbsFixed));
  setText(els.tndsFeeText, formatInteger(data.tndsFee));
  setText(els.grandTotalText, formatInteger(data.totalVcxFee));
  setText(els.totalWithTndsText, formatInteger(data.totalWithTnds));
}

function calculateAll() {
  updateUsageYears();
  updateDurationMonths();

  const data = getFormData();
  const validationError = validateForm(data);

  if (validationError) {
    clearSummary();
    setStatus(validationError, true);
    showPopup(validationError);
    return;
  }

  const vcxRow = findVcxRow(data);

  if (!vcxRow) {
    clearSummary();
    const message = "Không tìm thấy tỉ lệ VCX phù hợp.";
    setStatus(message, true);
    showPopup(message);
    return;
  }

  const vcxRateRaw = getField(vcxRow, ["rate"], 0);

  if (normalizeCode(vcxRateRaw) === "KPC") {
    clearSummary();
    const message = "VCX không phân cấp, không cho phép tính tự động.";
    setStatus(message, true);
    showPopup(message);
    return;
  }

  const vcxRate = parseJsonNumber(vcxRateRaw);

  if (!vcxRate || vcxRate <= 0) {
    clearSummary();
    const message = "Tỉ lệ VCX không hợp lệ.";
    setStatus(message, true);
    showPopup(message);
    return;
  }

  const dkbsResult = calculateDkbs(data);

  if (dkbsResult.blocked) {
    clearSummary();
    renderDkbs(dkbsResult);
    setStatus(dkbsResult.message, true);
    showPopup(dkbsResult.message);
    return;
  }

  const durationResult = getDurationFactor(data.durationMonths);

  if (!durationResult.valid) {
    clearSummary();
    setStatus(durationResult.message, true);
    showPopup(durationResult.message);
    return;
  }

  const totalRate = vcxRate + dkbsResult.totalRate;
  const totalFixed = dkbsResult.totalFixed;

  if (totalRate < 0) {
    clearSummary();
    const message = "Tổng tỷ lệ VCX/ĐKBS không hợp lệ.";
    setStatus(message, true);
    showPopup(message);
    return;
  }

  const totalVcxFee = data.insuredValue * totalRate / 100 * durationResult.factor + totalFixed;

  if (!Number.isFinite(totalVcxFee) || totalVcxFee < 0) {
    clearSummary();
    const message = "Phí VCX không hợp lệ.";
    setStatus(message, true);
    showPopup(message);
    return;
  }

  let tndsFee = 0;

  if (data.tndsParticipation === "YES") {
    const tndsRow = findTndsRow(data);

    if (!tndsRow) {
      clearSummary();
      showTndsWarning(true);
      const message = "Không tìm thấy phí TNDS phù hợp.";
      setStatus(message, true);
      showPopup(message);
      return;
    }

    const feeWithVatRaw = getField(tndsRow, ["fee_with_vat"], 0);

    if (normalizeCode(feeWithVatRaw) === "KPC") {
      clearSummary();
      showTndsWarning(true);
      const message = "TNDS không phân cấp, không cho phép tính tự động.";
      setStatus(message, true);
      showPopup(message);
      return;
    }

    tndsFee = parseJsonNumber(feeWithVatRaw);
    showTndsWarning(true);
  } else {
    showTndsWarning(false);
  }

  renderDkbs(dkbsResult);

  updateSummary({
    ...data,
    vcxRate,
    dkbsRate: dkbsResult.totalRate,
    dkbsFixed: dkbsResult.totalFixed,
    totalVcxFee,
    tndsFee,
    totalWithTnds: totalVcxFee + tndsFee
  });

  setStatus("Đã tính phí thành công.");
}

function resetForm() {
  if (els.vehicleValue) els.vehicleValue.value = "";
  if (els.insuredValue) els.insuredValue.value = "";
  if (els.startDate) els.startDate.value = "";
  if (els.endDate) els.endDate.value = "";
  if (els.durationMonths) els.durationMonths.value = "";
  if (els.usage) els.usage.value = "";
  if (els.vehicleType) {
    els.vehicleType.innerHTML = '<option value="">Chọn loại xe</option>';
    els.vehicleType.disabled = true;
  }
  if (els.manufactureYear) els.manufactureYear.value = "";
  if (els.usageYears) els.usageYears.value = "";
  if (els.seatCount) els.seatCount.value = "";
  if (els.payload) els.payload.value = "";
  if (els.dkbsInput) els.dkbsInput.value = "04;05A;06";
  if (els.tndsParticipation) els.tndsParticipation.value = "NO";

  clearSummary();
  setStatus("Đã xóa dữ liệu.");
}

function bindNumberInputs() {
  [els.vehicleValue, els.insuredValue].forEach((input) => {
    if (!input) {
      return;
    }

    input.addEventListener("input", () => formatInputNumber(input));
    input.addEventListener("blur", () => formatInputNumber(input));
  });
}

function bindEvents() {
  els.usage?.addEventListener("change", (event) => {
    renderVehicleOptions(event.target.value);
    setStatus("Đã cập nhật danh sách loại xe.");
  });

  els.vehicleType?.addEventListener("change", () => {
    const selectedVehicle = getSelectedVehicle();
    if (requiresSeatCount(selectedVehicle)) {
      setStatus("Bắt buộc điền số chỗ ngồi cho loại xe này.");
    }
  });

  els.manufactureYear?.addEventListener("input", updateUsageYears);
  els.startDate?.addEventListener("change", updateDurationMonths);
  els.endDate?.addEventListener("change", updateDurationMonths);

  els.tndsParticipation?.addEventListener("change", () => {
    showTndsWarning(normalizeCode(els.tndsParticipation?.value ?? "NO") === "YES");
  });

  els.calculateButton?.addEventListener("click", calculateAll);
  els.clearButton?.addEventListener("click", resetForm);

  bindNumberInputs();
}

async function init() {
  const [vehicleOptions, vcxRates, dkbsRates, tndsRates] = await Promise.all([
    loadJson("./data/vehicle-options.json"),
    loadJson("./data/vcx-rates.json"),
    loadJson("./data/dkbs.json"),
    loadJson("./data/tnds.json")
  ]);

  state.vehicleOptions = vehicleOptions;
  state.vcxRates = vcxRates;
  state.dkbsRates = dkbsRates;
  state.tndsRates = tndsRates;

  bindEvents();
  clearSummary();
  setStatus("Đã tải dữ liệu. Bạn có thể bắt đầu tính phí.");
}

init().catch((error) => {
  console.error(error);
  const message = error.message || "Có lỗi khi khởi tạo dữ liệu.";
  setStatus(message, true);
  showPopup(message);
});
