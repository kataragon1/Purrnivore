import { useState } from 'react'
import { FIELD_DEFS, FIELD_BY_KEY, OPERATORS_BY_TYPE, defaultOperator } from '../lib/query'

function blankRule() {
  return { id: Math.random().toString(36).slice(2), field: 'ingredients', operator: 'not_contains', value: '' }
}

function RuleValueInput({ rule, onChange }) {
  const field = FIELD_BY_KEY[rule.field]
  if (field.type === 'enum') {
    return (
      <select value={rule.value} onChange={e => onChange({ ...rule, value: e.target.value })}>
        <option value="">choose&hellip;</option>
        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  if (field.type === 'boolean') {
    return (
      <select value={rule.value} onChange={e => onChange({ ...rule, value: e.target.value })}>
        <option value="">choose&hellip;</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    )
  }
  return (
    <input
      type={field.type === 'number' ? 'number' : 'text'}
      placeholder={field.type === 'number' ? '0' : 'e.g. FOS'}
      value={rule.value}
      onChange={e => onChange({ ...rule, value: e.target.value })}
    />
  )
}

export default function AdvancedSearch({
  rules, onRulesChange,
  sort, onSortChange,
  tiebreak, onTiebreakChange,
}) {
  const [open, setOpen] = useState(false)

  function addRule() {
    onRulesChange([...rules, blankRule()])
  }
  function updateRule(id, next) {
    onRulesChange(rules.map(r => (r.id === id ? next : r)))
  }
  function removeRule(id) {
    onRulesChange(rules.filter(r => r.id !== id))
  }
  function setRuleField(id, fieldKey) {
    onRulesChange(rules.map(r => (r.id === id ? { field: fieldKey, operator: defaultOperator(fieldKey), value: '', id } : r)))
  }

  const hasCustomSort = !!sort
  const clearAll = () => {
    onRulesChange([])
    onSortChange(null)
    onTiebreakChange(null)
  }

  return (
    <div className="fgroup">
      <button className="adv-toggle" onClick={() => setOpen(o => !o)}>
        {open ? '− Advanced search' : '+ Advanced search'}
        {(rules.length > 0 || hasCustomSort) && !open ? ` (${rules.length}${hasCustomSort ? ' + sort' : ''})` : ''}
      </button>

      {open && (
        <div className="adv-panel">
          <div>
            <div className="adv-sub">Custom requirements (all must match)</div>
            {rules.map(rule => (
              <div className="adv-rule" key={rule.id}>
                <select value={rule.field} onChange={e => setRuleField(rule.id, e.target.value)}>
                  {FIELD_DEFS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
                <select value={rule.operator} onChange={e => updateRule(rule.id, { ...rule, operator: e.target.value })}>
                  {OPERATORS_BY_TYPE[FIELD_BY_KEY[rule.field].type].map(op => (
                    <option key={op.key} value={op.key}>{op.label}</option>
                  ))}
                </select>
                <RuleValueInput rule={rule} onChange={next => updateRule(rule.id, next)} />
                <button className="rm" onClick={() => removeRule(rule.id)} title="Remove requirement">&times;</button>
              </div>
            ))}
            <button className="adv-add" onClick={addRule}>+ Add requirement</button>
          </div>

          <div>
            <div className="adv-sub">Custom sort</div>
            <div className="adv-sortrow">
              <select
                value={sort?.field || ''}
                onChange={e => onSortChange(e.target.value ? { field: e.target.value, dir: sort?.dir || 'desc' } : null)}
              >
                <option value="">(use preset sort)</option>
                {FIELD_DEFS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
              <select
                value={sort?.dir || 'desc'}
                disabled={!sort}
                onChange={e => onSortChange({ field: sort.field, dir: e.target.value })}
              >
                <option value="desc">high &rarr; low / Z&ndash;A</option>
                <option value="asc">low &rarr; high / A&ndash;Z</option>
              </select>
            </div>
            {sort && (
              <div className="adv-sortrow">
                <select
                  value={tiebreak?.field || ''}
                  onChange={e => onTiebreakChange(e.target.value ? { field: e.target.value, dir: tiebreak?.dir || 'asc' } : null)}
                >
                  <option value="">(no tiebreaker)</option>
                  {FIELD_DEFS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
                <select
                  value={tiebreak?.dir || 'asc'}
                  disabled={!tiebreak}
                  onChange={e => onTiebreakChange({ field: tiebreak.field, dir: e.target.value })}
                >
                  <option value="desc">high &rarr; low / Z&ndash;A</option>
                  <option value="asc">low &rarr; high / A&ndash;Z</option>
                </select>
              </div>
            )}
          </div>

          {(rules.length > 0 || hasCustomSort) && (
            <button className="adv-clear" onClick={clearAll}>Clear advanced search</button>
          )}
        </div>
      )}
    </div>
  )
}
