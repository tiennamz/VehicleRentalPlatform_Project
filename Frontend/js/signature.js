/* =========================================================
   VRP-Go - Khung ký trên màn hình (khách hàng + nhân viên)
   File độc lập, không phụ thuộc PHP/CSDL. Lưu tạm bằng localStorage.
   ========================================================= */
(function () {
    'use strict';

    var STORAGE_KEY = 'vrp_e_signature_demo_v1';
    var $ = function (id) { return document.getElementById(id); };

    function defaultState() {
        return {
            customer: { name: 'Vũ Đức', strokes: [], signed: false, time: '', data: '' },
            staff: { name: 'Nguyễn An', strokes: [], signed: false, time: '', data: '' }
        };
    }

    function sanitizeRole(raw, fallback) {
        if (!raw || typeof raw !== 'object') return fallback;
        return {
            name: typeof raw.name === 'string' ? raw.name : fallback.name,
            strokes: Array.isArray(raw.strokes) ? raw.strokes.filter(function (s) {
                return Array.isArray(s) && s.every(function (p) {
                    return p && typeof p.x === 'number' && typeof p.y === 'number';
                });
            }) : [],
            signed: raw.signed === true,
            time: typeof raw.time === 'string' ? raw.time : '',
            data: typeof raw.data === 'string' ? raw.data : ''
        };
    }

    function load() {
        var base = defaultState();
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return base;
            var saved = JSON.parse(raw);
            base.customer = sanitizeRole(saved.customer, base.customer);
            base.staff = sanitizeRole(saved.staff, base.staff);
        } catch (e) { /* localStorage có thể bị chặn ở chế độ file:// */ }
        return base;
    }

    var state = load();
    var wasComplete = state.customer.signed && state.staff.signed;
    var toastTimer = null;

    function save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* bỏ qua */ }
    }

    function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

    function formatNow() {
        var d = new Date();
        var pad = function (n) { return String(n).padStart(2, '0'); };
        return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
            ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    function showToast(message) {
        var toast = $('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
    }

    function notify(title, text, icon) {
        if (window.Swal) {
            window.Swal.fire({ title: title, text: text, icon: icon, confirmButtonColor: '#079b70' });
        } else {
            showToast(title + (text ? ' — ' + text : ''));
        }
    }

    /* ------------------ KHUNG KÝ CANVAS ------------------ */
    function createPad(role) {
        var canvas = $(role + 'Canvas');
        var wrap = $(role + 'PadWrap');
        var placeholder = $(role + 'Placeholder');
        var clearBtn = $(role + 'Clear');
        var confirmBtn = $(role + 'Confirm');
        var pill = $(role + 'StatusPill');
        var panel = $(role + 'Panel');
        var hint = $(role + 'Hint');
        var timeEl = $(role + 'Time');
        var ctx = canvas.getContext('2d');

        var drawing = false;
        var activePointer = null;
        var activeStroke = null;
        var cssW = 0;
        var cssH = 0;

        function resize() {
            var rect = canvas.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            var dpr = Math.max(1, window.devicePixelRatio || 1);
            cssW = rect.width;
            cssH = rect.height;
            canvas.width = Math.round(cssW * dpr);
            canvas.height = Math.round(cssH * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            redraw();
            if (state[role].signed) {
                try { state[role].data = canvas.toDataURL('image/png'); save(); } catch (e) { /* no-op */ }
            }
        }

        function drawStroke(points) {
            if (!points.length) return;
            var x0 = points[0].x * cssW;
            var y0 = points[0].y * cssH;
            if (points.length === 1) {
                ctx.beginPath();
                ctx.arc(x0, y0, 1.4, 0, Math.PI * 2);
                ctx.fillStyle = '#16324f';
                ctx.fill();
                return;
            }
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            for (var i = 1; i < points.length - 1; i++) {
                var p = points[i];
                var n = points[i + 1];
                ctx.quadraticCurveTo(p.x * cssW, p.y * cssH, (p.x + n.x) / 2 * cssW, (p.y + n.y) / 2 * cssH);
            }
            var last = points[points.length - 1];
            ctx.lineTo(last.x * cssW, last.y * cssH);
            ctx.stroke();
        }

        function redraw() {
            if (!cssW || !cssH) return;
            ctx.clearRect(0, 0, cssW, cssH);
            ctx.strokeStyle = '#16324f';
            ctx.fillStyle = '#16324f';
            ctx.lineWidth = 2.4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            state[role].strokes.forEach(drawStroke);
        }

        function relativePoint(e) {
            var rect = canvas.getBoundingClientRect();
            return {
                x: clamp((e.clientX - rect.left) / rect.width, 0, 1),
                y: clamp((e.clientY - rect.top) / rect.height, 0, 1)
            };
        }

        canvas.addEventListener('pointerdown', function (e) {
            if (state[role].signed) return;
            e.preventDefault();
            try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* no-op */ }
            drawing = true;
            activePointer = e.pointerId;
            activeStroke = [relativePoint(e)];
            state[role].strokes.push(activeStroke);
            updateControls();
            redraw();
        });

        canvas.addEventListener('pointermove', function (e) {
            if (!drawing || e.pointerId !== activePointer) return;
            e.preventDefault();
            activeStroke.push(relativePoint(e));
            redraw();
        });

        function endStroke(e) {
            if (!drawing || (e && e.pointerId !== activePointer)) return;
            drawing = false;
            activePointer = null;
            activeStroke = null;
            save();
            updateControls();
        }

        canvas.addEventListener('pointerup', endStroke);
        canvas.addEventListener('pointercancel', endStroke);
        canvas.addEventListener('lostpointercapture', endStroke);

        function clear() {
            state[role].strokes = [];
            state[role].signed = false;
            state[role].time = '';
            state[role].data = '';
            drawing = false;
            activePointer = null;
            activeStroke = null;
            redraw();
            save();
            updateControls();
            render();
        }

        function confirm() {
            if (!state[role].strokes.length) return;
            state[role].signed = true;
            state[role].time = formatNow();
            try { state[role].data = canvas.toDataURL('image/png'); } catch (e) { /* no-op */ }
            save();
            updateControls();
            render();
            notify('Đã xác nhận chữ ký', role === 'customer' ? 'Khách hàng đã ký hợp đồng.' : 'Nhân viên đã ký hợp đồng.', 'success');
            checkCompletion();
        }

        function updateControls() {
            var hasStrokes = state[role].strokes.length > 0;
            var signed = state[role].signed;
            clearBtn.disabled = !hasStrokes && !signed;
            clearBtn.innerHTML = signed
                ? '<i class="fa-solid fa-rotate-left"></i> Ký lại'
                : '<i class="fa-solid fa-eraser"></i> Xóa chữ ký';
            confirmBtn.disabled = signed || !hasStrokes;
            confirmBtn.innerHTML = signed
                ? '<i class="fa-solid fa-check"></i> Đã xác nhận'
                : '<i class="fa-solid fa-check"></i> Xác nhận chữ ký';
            placeholder.classList.toggle('hidden', hasStrokes || signed);
            wrap.classList.toggle('active', hasStrokes && !signed);
            wrap.classList.toggle('locked', signed);
            panel.classList.toggle('signed-panel', signed);
            hint.innerHTML = signed
                ? 'Đã xác nhận lúc <strong>' + state[role].time + '</strong>.'
                : 'Vui lòng ký nét mực trong khung bên trên.';
        }

        clearBtn.addEventListener('click', function () {
            if (state[role].signed) {
                var ok = window.confirm('Bạn muốn hủy xác nhận và ký lại chữ ký này?');
                if (!ok) return;
            }
            clear();
            showToast('Đã xóa chữ ký ' + (role === 'customer' ? 'khách hàng' : 'nhân viên') + '.');
        });
        confirmBtn.addEventListener('click', confirm);

        return { resize: resize, redraw: redraw, clear: clear, updateControls: updateControls };
    }

    /* ------------------ CẬP NHẬT TRẠNG THÁI CHUNG ------------------ */
    function setTimeline(id, status) {
        var el = $(id);
        el.classList.remove('waiting', 'current', 'done');
        el.classList.add(status);
        var dot = el.querySelector('.timeline-dot');
        dot.textContent = status === 'done' ? '\u2713' : (id === 'stepCustomer' ? '1' : id === 'stepStaff' ? '2' : '3');
    }

    function setPreviewImage(imgId, data) {
        var img = $(imgId);
        if (data) img.setAttribute('src', data);
        else img.removeAttribute('src');
    }

    function render() {
        var c = state.customer;
        var s = state.staff;
        var complete = c.signed && s.signed;
        var count = (c.signed ? 1 : 0) + (s.signed ? 1 : 0);

        // Nhãn trạng thái từng khung ký
        ['customer', 'staff'].forEach(function (role) {
            var signed = state[role].signed;
            var pill = $(role + 'StatusPill');
            pill.classList.toggle('signed', signed);
            pill.classList.toggle('waiting', !signed);
            pill.innerHTML = signed
                ? '<i class="fa-solid fa-check"></i> Đã xác nhận'
                : '<i class="fa-regular fa-clock"></i> Chưa ký';
            $(role + 'Time').textContent = signed
                ? 'Thời gian xác nhận: ' + state[role].time + ' · bởi ' + (state[role].name || '—')
                : 'Chưa có thời gian xác nhận';
        });

        // Trạng thái tổng
        var badge = $('overallBadge');
        var waitingBox = $('waitingBox');
        var badgeText, waitingTitle, waitingDesc;
        if (complete) {
            badgeText = 'Đã hoàn tất ký kết';
            waitingTitle = 'Hợp đồng đã hoàn tất';
            waitingDesc = 'Cả hai bên đã xác nhận chữ ký. Bạn có thể xem trước và in hợp đồng.';
        } else if (c.signed) {
            badgeText = 'Đang chờ nhân viên xác nhận';
            waitingTitle = 'Đang chờ nhân viên xác nhận';
            waitingDesc = 'Khách hàng đã ký. Cần nhân viên cửa hàng ký để hoàn tất hợp đồng.';
        } else if (s.signed) {
            badgeText = 'Đang chờ khách hàng xác nhận';
            waitingTitle = 'Đang chờ khách hàng xác nhận';
            waitingDesc = 'Nhân viên đã ký. Cần khách hàng ký để hoàn tất hợp đồng.';
        } else {
            badgeText = 'Đang chờ 2 bên xác nhận';
            waitingTitle = 'Đang chờ 2 bên xác nhận';
            waitingDesc = 'Cần chữ ký của khách hàng và nhân viên để hoàn tất hợp đồng.';
        }
        $('overallBadgeText').textContent = badgeText;
        $('waitingTitle').textContent = waitingTitle;
        $('waitingDesc').textContent = waitingDesc;
        badge.classList.toggle('done', complete);
        badge.classList.toggle('waiting', !complete);
        waitingBox.classList.toggle('complete', complete);

        $('progressFill').style.width = (count / 2 * 100) + '%';
        $('progressCaption').textContent = count + ' / 2 chữ ký';

        setTimeline('stepCustomer', c.signed ? 'done' : 'current');
        setTimeline('stepStaff', s.signed ? 'done' : (c.signed ? 'current' : 'waiting'));
        setTimeline('stepDone', complete ? 'done' : 'waiting');
        $('stepCustomerText').textContent = c.signed ? 'Đã ký lúc ' + c.time : 'Đang chờ khách hàng ký';
        $('stepStaffText').textContent = s.signed ? 'Đã ký lúc ' + s.time : 'Đang chờ nhân viên ký';
        $('stepDoneText').textContent = complete ? 'Hợp đồng có hiệu lực · ' + c.time : 'Sẽ mở khi đủ 2 chữ ký';

        $('printBtn').disabled = !complete;
        $('previewPrint').disabled = !complete;
        var note = $('previewNote');
        note.textContent = complete
            ? 'Hợp đồng đã hoàn tất vào lúc ' + c.time + '. Cả hai bên đã xác nhận chữ ký.'
            : 'Hợp đồng chưa hoàn tất — đang chờ đủ chữ ký của cả hai bên.';
        note.classList.toggle('complete', complete);

        setPreviewImage('previewCustomerSig', c.data);
        setPreviewImage('previewStaffSig', s.data);
        $('previewCustomerName').textContent = c.name || '—';
        $('previewStaffName').textContent = s.name || '—';
        $('previewCustomerTime').textContent = c.signed ? 'Đã ký · ' + c.time : 'Chưa ký';
        $('previewStaffTime').textContent = s.signed ? 'Đã ký · ' + s.time : 'Chưa ký';
    }

    function checkCompletion() {
        var complete = state.customer.signed && state.staff.signed;
        if (complete && !wasComplete) {
            notify('Hoàn tất ký hợp đồng', 'Cả hai bên đã xác nhận. Bạn có thể in hợp đồng.', 'success');
        }
        wasComplete = complete;
    }

    /* ------------------ KHỞI TẠO ------------------ */
    document.addEventListener('DOMContentLoaded', function () {
        var pads = {
            customer: createPad('customer'),
            staff: createPad('staff')
        };

        $('customerName').value = state.customer.name;
        $('staffName').value = state.staff.name;
        $('customerName').addEventListener('input', function () {
            state.customer.name = this.value;
            save();
            render();
        });
        $('staffName').addEventListener('input', function () {
            state.staff.name = this.value;
            save();
            render();
        });

        pads.customer.resize();
        pads.staff.resize();
        pads.customer.updateControls();
        pads.staff.updateControls();
        render();

        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                pads.customer.resize();
                pads.staff.resize();
            }, 120);
        });

        window.addEventListener('beforeprint', function () {
            pads.customer.resize();
            pads.staff.resize();
        });

        // Modal xem trước
        var modal = $('previewModal');
        function openModal() {
            render();
            modal.hidden = false;
            $('previewClose').focus();
        }
        function closeModal() { modal.hidden = true; }
        $('previewBtn').addEventListener('click', openModal);
        $('previewClose').addEventListener('click', closeModal);
        $('previewCancel').addEventListener('click', closeModal);
        modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeModal();
        });

        function printContract() {
            if (!state.customer.signed || !state.staff.signed) {
                showToast('Cần đủ chữ ký của cả hai bên trước khi in hợp đồng.');
                return;
            }
            closeModal();
            window.print();
        }
        $('printBtn').addEventListener('click', printContract);
        $('previewPrint').addEventListener('click', printContract);

        // Đặt lại toàn bộ
        $('resetBtn').addEventListener('click', function () {
            function doReset() {
                var fresh = defaultState();
                state.customer = fresh.customer;
                state.staff = fresh.staff;
                wasComplete = false;
                $('customerName').value = state.customer.name;
                $('staffName').value = state.staff.name;
                save();
                pads.customer.clear();
                pads.staff.clear();
                pads.customer.updateControls();
                pads.staff.updateControls();
                render();
                showToast('Đã đặt lại cả hai khung ký.');
            }
            if (window.Swal) {
                window.Swal.fire({
                    title: 'Đặt lại chữ ký?',
                    text: 'Chữ ký của cả hai bên sẽ bị xóa và trạng thái trở về chờ xác nhận.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Đặt lại',
                    cancelButtonText: 'Hủy',
                    confirmButtonColor: '#079b70'
                }).then(function (result) { if (result.isConfirmed) doReset(); });
            } else if (window.confirm('Đặt lại cả hai chữ ký?')) {
                doReset();
            }
        });

        // Menu mobile
        var hamburger = $('hamburgerBtn');
        var popup = $('navPopup');
        var overlay = $('navPopupOverlay');
        function closeMenu() { popup.classList.remove('open'); overlay.classList.remove('open'); }
        hamburger.addEventListener('click', function () {
            popup.classList.add('open');
            overlay.classList.add('open');
        });
        $('popupCloseBtn').addEventListener('click', closeMenu);
        overlay.addEventListener('click', closeMenu);
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    });
})();
