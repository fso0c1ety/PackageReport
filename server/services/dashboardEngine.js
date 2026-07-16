const numeric = (value) => { const parsed = Number(String(value?.amount ?? value?.value ?? value ?? '').replace(/[^0-9.-]/g,'')); return Number.isFinite(parsed) ? parsed : 0; };
export const DASHBOARD_WIDGET_TYPES = Object.freeze(['kpi','revenue','expenses','profit','status','activity','calendar','table','chart','map','progress','number','text','image','tasks','notifications','files']);

export function calculateWidget(rows, widget) {
  const values=(rows||[]).map((row)=>row.values?.[widget.columnId]);
  if (widget.aggregation==='sum') return values.reduce((sum,value)=>sum+numeric(value),0);
  if (widget.aggregation==='average') return values.length ? values.reduce((sum,value)=>sum+numeric(value),0)/values.length : 0;
  if (widget.aggregation==='min') return values.length ? Math.min(...values.map(numeric)) : 0;
  if (widget.aggregation==='max') return values.length ? Math.max(...values.map(numeric)) : 0;
  if (widget.aggregation==='count_non_empty') return values.filter((value)=>value!==''&&value!=null).length;
  return (rows||[]).length;
}

export function normalizeDashboard(input={}) {
  const widgets=(input.widgets||[]).filter((widget)=>DASHBOARD_WIDGET_TYPES.includes(widget.type)).map((widget,index)=>({
    id:String(widget.id||`widget-${index+1}`), type:widget.type, title:String(widget.title||widget.type), description:String(widget.description||''),
    boardId:widget.boardId||null,columnId:widget.columnId||null,aggregation:widget.aggregation||'count',filters:Array.isArray(widget.filters)?widget.filters:[],
    dateRange:widget.dateRange||null,groupBy:widget.groupBy||null,chartType:widget.chartType||'bar',refresh:widget.refresh||'realtime',
    size:['small','medium','large'].includes(widget.size)?widget.size:'medium',position:Number.isFinite(widget.position)?widget.position:index,permissions:widget.permissions||{view:['owner','admin','manager','employee']},
  }));
  return { id:input.id||null,name:String(input.name||'Board dashboard'),widgets:widgets.sort((a,b)=>a.position-b.position) };
}

export function reorderWidgets(widgets, sourceIndex, destinationIndex) {
  const copy=[...(widgets||[])]; const [moved]=copy.splice(sourceIndex,1); if(!moved)return copy; copy.splice(destinationIndex,0,moved); return copy.map((widget,index)=>({...widget,position:index}));
}
