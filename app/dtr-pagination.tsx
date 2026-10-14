'use client';

import { useId } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import styles from './dtr-pagination.module.css';

type PageToken = number | 'ellipsis-left' | 'ellipsis-right';

function pageTokens(page: number, totalPages: number): PageToken[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (page <= 3) return [1, 2, 3, 4, 'ellipsis-right', totalPages];
  if (page >= totalPages - 2) return [1, 'ellipsis-left', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, 'ellipsis-left', page - 1, page, page + 1, 'ellipsis-right', totalPages];
}

export default function DtrPagination({
  page,
  pageSize,
  totalItems,
  itemLabel = 'logs',
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const pageSizeId = useId();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <footer className={`dtr-pagination ${styles.footer}`}>
      <div className={styles.layout}>
        <p className={styles.summary} aria-live="polite" aria-atomic="true">
          {totalItems === 0 ? `No ${itemLabel} to show` : <>
            <span>Showing</span> <strong>{firstItem}–{lastItem}</strong> <span>of</span> <strong>{totalItems}</strong> <span>{itemLabel}</span>
          </>}
        </p>
        <div className={styles.size}>
          <label htmlFor={pageSizeId}>Rows per page</label>
          <Select value={String(pageSize)} onValueChange={(value: string) => onPageSizeChange(Number(value))}>
            <SelectTrigger id={pageSizeId} className={styles.select} aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={styles.selectMenu} position="popper" align="end">
              {[10, 25, 50, 100].map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <nav className={styles.navigation} aria-label="DTR pages">
          <button type="button" className={styles.button} aria-label="First page" title="First page" disabled={currentPage === 1} onClick={() => onPageChange(1)}>
            <ChevronsLeft size={16} aria-hidden="true" />
          </button>
          <button type="button" className={styles.button} aria-label="Previous page" title="Previous page" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
            <ChevronLeft size={16} aria-hidden="true" /><span className={styles.buttonLabel}>Previous</span>
          </button>
          <div className={styles.pages}>
            {pageTokens(currentPage, totalPages).map(token => typeof token === 'number' ? (
              <button
                type="button"
                key={token}
                className={styles.button}
                aria-label={`Page ${token}`}
                aria-current={token === currentPage ? 'page' : undefined}
                onClick={() => onPageChange(token)}
              >
                {token}
              </button>
            ) : <span className={styles.ellipsis} key={token} aria-hidden="true">…</span>)}
          </div>
          <span className={styles.pageIndicator}>Page <strong>{currentPage}</strong> of {totalPages}</span>
          <button type="button" className={styles.button} aria-label="Next page" title="Next page" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
            <span className={styles.buttonLabel}>Next</span><ChevronRight size={16} aria-hidden="true" />
          </button>
          <button type="button" className={styles.button} aria-label="Last page" title="Last page" disabled={currentPage === totalPages} onClick={() => onPageChange(totalPages)}>
            <ChevronsRight size={16} aria-hidden="true" />
          </button>
        </nav>
      </div>
    </footer>
  );
}
