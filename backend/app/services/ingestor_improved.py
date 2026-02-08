from typing import List, Dict
import re
import logging

logger = logging.getLogger(__name__)

def chunk_content(
    content: str,
    file_path: str,
    chunk_type: str,
    max_chunk_size: int = 1500
) -> List[Dict]:
    """
    Intelligent chunking strategy based on code structure.
    
    Strategy:
    - For Python: Split by functions/classes
    - For JavaScript/TypeScript: Split by functions/classes
    - For other: Split by logical sections with overlap
    
    Args:
        content: File content to chunk
        file_path: Path of the file (for language detection)
        chunk_type: Type of chunk (function, class, file)
        max_chunk_size: Maximum characters per chunk
    
    Returns:
        List of chunk dictionaries with content and metadata
    """
    
    # Detect language from file extension
    ext = file_path.split('.')[-1].lower()
    
    if ext in ['py']:
        return _chunk_python(content, max_chunk_size)
    elif ext in ['js', 'ts', 'jsx', 'tsx']:
        return _chunk_javascript(content, max_chunk_size)
    else:
        return _chunk_generic(content, max_chunk_size)


def _chunk_python(content: str, max_size: int) -> List[Dict]:
    """
    Chunk Python code by functions and classes.
    Preserves docstrings and context.
    """
    chunks = []
    
    # Regex to find function and class definitions
    pattern = r'^(def |class |async def )'
    lines = content.split('\n')
    
    current_chunk = []
    current_start_line = 1
    
    for i, line in enumerate(lines, 1):
        current_chunk.append(line)
        
        # If we hit a new function/class and current chunk is non-empty
        if re.match(pattern, line) and len('\n'.join(current_chunk)) > max_size:
            chunk_content = '\n'.join(current_chunk[:-1])
            if chunk_content.strip():
                chunks.append({
                    'content': chunk_content,
                    'line_start': current_start_line,
                    'line_end': i - 1,
                    'index': len(chunks)
                })
            current_chunk = [line]
            current_start_line = i
    
    # Add remaining chunk
    if current_chunk:
        chunk_content = '\n'.join(current_chunk)
        if chunk_content.strip():
            chunks.append({
                'content': chunk_content,
                'line_start': current_start_line,
                'line_end': len(lines),
                'index': len(chunks)
            })
    
    # Fallback: if no chunks created, treat as single chunk
    if not chunks:
        chunks.append({
            'content': content,
            'line_start': 1,
            'line_end': len(lines),
            'index': 0
        })
    
    logger.info(f"Python chunking: {len(chunks)} chunks created")
    return chunks


def _chunk_javascript(content: str, max_size: int) -> List[Dict]:
    """
    Chunk JavaScript/TypeScript by functions and classes.
    """
    chunks = []
    
    # Patterns for JS/TS functions and classes
    pattern = r'^(function |const .* = |class |export (default )?(function|class|const))'
    lines = content.split('\n')
    
    current_chunk = []
    current_start_line = 1
    
    for i, line in enumerate(lines, 1):
        current_chunk.append(line)
        
        if re.search(pattern, line.lstrip()) and len('\n'.join(current_chunk)) > max_size:
            chunk_content = '\n'.join(current_chunk[:-1])
            if chunk_content.strip():
                chunks.append({
                    'content': chunk_content,
                    'line_start': current_start_line,
                    'line_end': i - 1,
                    'index': len(chunks)
                })
            current_chunk = [line]
            current_start_line = i
    
    if current_chunk:
        chunk_content = '\n'.join(current_chunk)
        if chunk_content.strip():
            chunks.append({
                'content': chunk_content,
                'line_start': current_start_line,
                'line_end': len(lines),
                'index': len(chunks)
            })
    
    if not chunks:
        chunks.append({
            'content': content,
            'line_start': 1,
            'line_end': len(lines),
            'index': 0
        })
    
    logger.info(f"JavaScript chunking: {len(chunks)} chunks created")
    return chunks


def _chunk_generic(content: str, max_size: int, overlap: int = 200) -> List[Dict]:
    """
    Generic chunking with overlap for unknown file types.
    """
    chunks = []
    lines = content.split('\n')
    
    current_chunk = []
    current_size = 0
    current_start_line = 1
    
    for i, line in enumerate(lines, 1):
        current_chunk.append(line)
        current_size += len(line)
        
        if current_size > max_size:
            chunk_content = '\n'.join(current_chunk)
            chunks.append({
                'content': chunk_content,
                'line_start': current_start_line,
                'line_end': i,
                'index': len(chunks)
            })
            
            # Keep overlap for context
            overlap_lines = int(overlap / (current_size / len(current_chunk)))
            current_chunk = current_chunk[-overlap_lines:] if overlap_lines > 0 else []
            current_start_line = i - len(current_chunk)
            current_size = sum(len(l) for l in current_chunk)
    
    if current_chunk:
        chunk_content = '\n'.join(current_chunk)
        if chunk_content.strip():
            chunks.append({
                'content': chunk_content,
                'line_start': current_start_line,
                'line_end': len(lines),
                'index': len(chunks)
            })
    
    if not chunks:
        chunks.append({
            'content': content,
            'line_start': 1,
            'line_end': len(lines),
            'index': 0
        })
    
    logger.info(f"Generic chunking: {len(chunks)} chunks created")
    return chunks


async def deduplicate_check(supabase, project_id: str, file_path: str) -> bool:
    """
    Check if a file has already been indexed.
    Returns True if file exists in database.
    """
    try:
        result = supabase.table("code_chunks").select("id").eq(
            "project_id", project_id
        ).eq("file_path", file_path).limit(1).execute()
        
        return bool(result.data)
    except Exception as e:
        logger.error(f"Deduplication check failed: {e}")
        return False
