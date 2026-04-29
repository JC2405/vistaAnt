/* ─────────────────────────────────────────────────────────────────────────────
   SearchableDropdown
────────────────────────────────────────────────────────────────────────────── */
export class SearchableDropdown {
    constructor({ triggerEl, inputId, displayId, placeholder = 'Buscar...', onSelect, onOpen, emptyText = 'Sin resultados' }) {
        this.triggerEl = typeof triggerEl === 'string' ? document.getElementById(triggerEl) : triggerEl;
        this.inputEl = document.getElementById(inputId);
        this.displayEl = document.getElementById(displayId);
        this.placeholder = placeholder;
        this.onSelect = onSelect || (() => { });
        this.onOpen = onOpen || (() => { });
        this.emptyText = emptyText;
        this.items = [];
        this._disabled = false;
        this._dropdown = null;
        this._bound = this._onOutsideClick.bind(this);
        this._build();
    }

    _build() {
        this._dropdown = document.createElement('div');
        this._dropdown.className = 'sd-dropdown';
        this._dropdown.innerHTML = `
            <div class="sd-search-wrap">
                <i class="bi bi-search sd-icon"></i>
                <input type="text" class="sd-search" placeholder="${this.placeholder}" autocomplete="off" spellcheck="false">
                <button type="button" class="sd-clear" title="Limpiar"><i class="bi bi-x"></i></button>
            </div>
            <ul class="sd-list"></ul>
            <div class="sd-empty d-none"><i class="bi bi-inbox-fill"></i><span>${this.emptyText}</span></div>`;

        if (!document.getElementById('sd-styles')) {
            const style = document.createElement('style');
            style.id = 'sd-styles';
            style.textContent = `
                .sd-trigger-wrap { position: relative; }
                .sd-trigger-input { cursor: pointer !important; background: #fff !important; user-select: none; }
                .sd-chevron {
                    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                    color: #9ca3af; pointer-events: none; font-size: .78rem;
                    transition: transform .2s cubic-bezier(.4,0,.2,1);
                }
                .sd-chevron.open { transform: translateY(-50%) rotate(180deg); color: var(--primary, #7c3aed); }
                .sd-trigger-wrap.sd-has-value .sd-chevron { color: var(--primary, #7c3aed); }
                .sd-dropdown {
                    position: fixed; z-index: 9999;
                    background: #fff; border-radius: .8rem;
                    box-shadow: 0 10px 40px rgba(0,0,0,.13), 0 2px 8px rgba(0,0,0,.07);
                    border: 1px solid rgba(0,0,0,.07);
                    overflow: hidden;
                    animation: sdIn .16s cubic-bezier(.16,1,.3,1);
                }
                @keyframes sdIn {
                    from { opacity: 0; transform: translateY(-8px) scale(.97); }
                    to   { opacity: 1; transform: translateY(0)   scale(1);    }
                }
                .sd-search-wrap {
                    display: flex; align-items: center; gap: .5rem;
                    padding: .6rem .85rem; border-bottom: 1px solid #f0f0f0;
                    background: #fafafa;
                }
                .sd-icon { color: #9ca3af; font-size: .82rem; flex-shrink: 0; }
                .sd-search {
                    border: none; outline: none; flex: 1;
                    font-size: .875rem; background: transparent; color: #111;
                }
                .sd-search::placeholder { color: #c0c0c0; }
                .sd-clear {
                    border: none; background: none; padding: 2px 4px; cursor: pointer;
                    color: #aaa; font-size: 1rem; line-height: 1;
                    display: flex; align-items: center; border-radius: 50%;
                    opacity: 0; transition: opacity .15s, background .15s;
                }
                .sd-clear.visible { opacity: 1; }
                .sd-clear:hover { background: #f0f0f0; color: #555; }
                .sd-list {
                    list-style: none; margin: 0; padding: .3rem 0;
                    max-height: 256px; overflow-y: auto;
                }
                .sd-list::-webkit-scrollbar { width: 4px; }
                .sd-list::-webkit-scrollbar-track { background: transparent; }
                .sd-list::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
                .sd-item {
                    display: flex; flex-direction: column; justify-content: center;
                    padding: .55rem 1rem; cursor: pointer;
                    transition: background .1s;
                    font-size: .875rem; color: #1f2937;
                    border-left: 3px solid transparent;
                }
                .sd-item:hover  { background: #f5f3ff; border-left-color: var(--primary, #7c3aed); }
                .sd-item.focused { background: #ede9fe; border-left-color: var(--primary, #7c3aed); }
                .sd-item.selected {
                    background: #ede9fe; color: var(--primary, #7c3aed);
                    font-weight: 600; border-left-color: var(--primary, #7c3aed);
                }
                .sd-item .sd-label { line-height: 1.3; }
                .sd-item .sd-sub   { font-size: .73rem; color: #9ca3af; margin-top: .1rem; }
                .sd-empty {
                    display: flex; flex-direction: column; align-items: center;
                    gap: .4rem; padding: 1.5rem 1rem;
                    color: #9ca3af; font-size: .82rem;
                }
                .sd-empty i { font-size: 1.5rem; opacity: .35; }
                .sd-loading {
                    display: flex; align-items: center; justify-content: center;
                    gap: .6rem; padding: 1.1rem; color: #9ca3af; font-size: .82rem;
                    list-style: none;
                }
                .sd-loading .spinner-border { width: .9rem; height: .9rem; border-width: 2px; }
                mark.sd-hl {
                    background: #ede9fe; color: var(--primary, #7c3aed);
                    padding: 0; border-radius: 2px; font-weight: 600;
                }
            `;
            document.head.appendChild(style);
        }

        this.triggerEl.classList.add('sd-trigger-wrap');
        this.triggerEl.querySelectorAll('input[type="text"]').forEach(inp => {
            inp.classList.add('sd-trigger-input');
            inp.readOnly = true;
        });

        this._chevron = document.createElement('i');
        this._chevron.className = 'bi bi-chevron-down sd-chevron';
        this.triggerEl.appendChild(this._chevron);

        this.triggerEl.addEventListener('click', (e) => {
            if (this._disabled) return;
            e.stopPropagation();
            this._isOpen() ? this.close() : this.open();
        });

        const search = this._dropdown.querySelector('.sd-search');
        const clearBtn = this._dropdown.querySelector('.sd-clear');

        search.addEventListener('input', () => {
            clearBtn.classList.toggle('visible', search.value.length > 0);
            this._filter(search.value);
        });
        search.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { this.close(); }
            if (e.key === 'ArrowDown') { e.preventDefault(); this._moveFocus(1); }
            if (e.key === 'ArrowUp') { e.preventDefault(); this._moveFocus(-1); }
            if (e.key === 'Enter') { e.preventDefault(); this._selectFocused(); }
        });
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            search.value = '';
            clearBtn.classList.remove('visible');
            this._filter('');
            search.focus();
        });
        this._dropdown.addEventListener('click', (e) => {
            const li = e.target.closest('.sd-item');
            if (li) this._pickItem(li);
        });
    }

    _isOpen() { return !!this._dropdown.parentNode; }

    open() {
        if (this._isOpen()) return;
        this.onOpen();

        // Evadir la trampa de focus de Bootstrap Modal insertando el menú dentro de `.modal` si existe.
        const modal = this.triggerEl.closest('.modal');
        if (modal) {
            modal.appendChild(this._dropdown);
        } else {
            document.body.appendChild(this._dropdown);
        }

        this._reposition();
        this._chevron.classList.add('open');
        const search = this._dropdown.querySelector('.sd-search');
        search.value = '';
        this._dropdown.querySelector('.sd-clear').classList.remove('visible');
        this._filter('');
        setTimeout(() => search.focus(), 150); // Timeout levemente superior recomendado por bootstrap
        document.addEventListener('click', this._bound);
    }

    _reposition() {
        if (!this._isOpen()) return;
        const rect = this.triggerEl.getBoundingClientRect();
        const ddH = Math.min(this._dropdown.scrollHeight || 340, 340);
        const below = window.innerHeight - rect.bottom;
        const above = rect.top;
        const goUp = below < ddH + 8 && above > ddH + 8;
        this._dropdown.style.width = rect.width + 'px';
        this._dropdown.style.left = rect.left + 'px';
        this._dropdown.style.top = goUp
            ? (rect.top - ddH - 4) + 'px'
            : (rect.bottom + 4) + 'px';
    }

    close() {
        if (!this._isOpen()) return;
        this._dropdown.remove();
        this._chevron.classList.remove('open');
        document.removeEventListener('click', this._bound);
    }

    _onOutsideClick(e) {
        if (!this.triggerEl.contains(e.target) && !this._dropdown.contains(e.target)) this.close();
    }

    setItems(arr) {
        this.items = arr;
        if (this._isOpen()) this._filter(this._dropdown.querySelector('.sd-search').value);
    }

    _highlight(str, q) {
        if (!q || !str) return str || '';
        const idx = str.toLowerCase().indexOf(q.toLowerCase());
        if (idx === -1) return str;
        return str.slice(0, idx) +
            `<mark class="sd-hl">${str.slice(idx, idx + q.length)}</mark>` +
            str.slice(idx + q.length);
    }

    _filter(q) {
        const list = this._dropdown.querySelector('.sd-list');
        const empty = this._dropdown.querySelector('.sd-empty');
        const lq = q.trim();
        const filtered = lq
            ? this.items.filter(i =>
                (i.label || '').toLowerCase().includes(lq.toLowerCase()) ||
                (i.sub || '').toLowerCase().includes(lq.toLowerCase()))
            : this.items;
        if (!filtered.length) {
            list.innerHTML = '';
            empty.classList.remove('d-none');
            return;
        }
        empty.classList.add('d-none');
        const curVal = this.inputEl?.value;
        list.innerHTML = filtered.map(item => {
            const selected = String(item.id) === String(curVal);
            const badgeHtml = item.isRecommended ? `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 ms-2 pb-0 pt-0" style="font-size:0.65rem; padding:0.2em 0.5em;"><i class="bi bi-star-fill text-warning" style="margin-right:2px;"></i>Recomendado</span>` : '';
            return `<li class="sd-item${selected ? ' selected' : ''}"
                        data-id="${item.id}"
                        data-label="${(item.label || '').replace(/"/g, '&quot;')}">
                        <span class="sd-label d-flex align-items-center">${this._highlight(item.label, lq)}${badgeHtml}</span>
                        ${item.sub ? `<span class="sd-sub">${this._highlight(item.sub, lq)}</span>` : ''}
                    </li>`;
        }).join('');
    }

    _moveFocus(dir) {
        const items = [...this._dropdown.querySelectorAll('.sd-item')];
        if (!items.length) return;
        const cur = this._dropdown.querySelector('.sd-item.focused');
        let idx = cur ? items.indexOf(cur) + dir : (dir > 0 ? 0 : items.length - 1);
        idx = Math.max(0, Math.min(idx, items.length - 1));
        items.forEach(i => i.classList.remove('focused'));
        items[idx].classList.add('focused');
        items[idx].scrollIntoView({ block: 'nearest' });
    }

    _selectFocused() {
        const focused = this._dropdown.querySelector('.sd-item.focused');
        if (focused) this._pickItem(focused);
    }

    _pickItem(li) {
        const id = li.dataset.id;
        const label = li.dataset.label;
        this.setValue(id, label);
        this.onSelect(this.items.find(i => String(i.id) === String(id)) || { id, label });
        this.close();
    }

    setValue(id, label) {
        if (this.inputEl) this.inputEl.value = id;
        if (this.displayEl) this.displayEl.value = label;
        this.triggerEl.classList.toggle('sd-has-value', !!id);
    }

    reset(placeholder = '') {
        if (this.inputEl) this.inputEl.value = '';
        if (this.displayEl) {
            this.displayEl.value = '';
            if (placeholder) this.displayEl.placeholder = placeholder;
        }
        this.triggerEl.classList.remove('sd-has-value');
    }

    disable(msg = '') {
        this._disabled = true;
        this.triggerEl.style.opacity = '.55';
        this.triggerEl.style.pointerEvents = 'none';
        if (msg && this.displayEl) this.displayEl.placeholder = msg;
    }

    enable(placeholder = '') {
        this._disabled = false;
        this.triggerEl.style.opacity = '';
        this.triggerEl.style.pointerEvents = '';
        if (placeholder && this.displayEl) this.displayEl.placeholder = placeholder;
    }

    destroy() {
        this.close();
        this._chevron?.remove();
        this.triggerEl.classList.remove('sd-trigger-wrap', 'sd-has-value');
        this.triggerEl.querySelectorAll('input').forEach(i => i.classList.remove('sd-trigger-input'));
    }
}