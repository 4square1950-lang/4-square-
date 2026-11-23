import { useState } from 'react';
import { SCHOOL_BOOKS } from '../utils/schoolBooks';

export function SchoolBookReader({ index, onClose }:{index:number;onClose:()=>void}) {
  const [page,setPage] = useState(0);
  const book = SCHOOL_BOOKS[index];
  return <div className="league-overlay" role="dialog" aria-modal="true" aria-label={book.title}>
    <section className="league-panel max-w-3xl" onKeyDown={(e)=>{
      if(e.key==='Escape')onClose();
      if(e.key==='ArrowRight')setPage((value)=>Math.min(book.pages.length-1,value+1));
      if(e.key==='ArrowLeft')setPage((value)=>Math.max(0,value-1));
    }}>
      <header className="league-header"><h2>{book.title}</h2><button className="league-button" onClick={onClose}>Close book</button></header>
      <article key={page} className="school-page">
        <small>{book.author}</small><h3>{book.pages[page].title}</h3>
        <p>{book.pages[page].text}</p><small>Page {page+1} of {book.pages.length}</small>
      </article>
      <footer className="league-footer"><button className="league-button" disabled={page===0} onClick={()=>setPage(page-1)}>Previous page</button><button className="league-primary" disabled={page===book.pages.length-1} onClick={()=>setPage(page+1)}>Next page</button></footer>
    </section>
  </div>;
}
